import { query } from './pool'

// Self-healing app schema. Some installs were created from an older schema.sql
// and are missing columns/indexes the app now relies on (e.g. detected_issues.source,
// which surfaced as "column source does not exist" during a scan). This runs the
// critical idempotent migrations once per process so the app works without the
// operator having to re-run db/schema.sql by hand.
let ran: Promise<void> | null = null

async function migrate(): Promise<void> {
  // ── Auth: per-user profiles keyed by the Supabase auth user id ────────────
  // Credentials live in Supabase Auth (auth.users); this table only stores the
  // app role (admin/user). Provisioned lazily by lib/auth/ownership.ts.
  await query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id         uuid PRIMARY KEY,
      email      text,
      role       text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `).catch(() => {})

  // Ownership columns used to reference the legacy `users` table. Now they hold
  // Supabase auth uids, so the old foreign keys would reject every insert. Drop
  // any FK constraint on these columns (idempotent — no-op once removed).
  const ownerCols: [string, string][] = [
    ['monitored_connections', 'added_by'],
    ['detected_issues',       'resolved_by'],
    ['autopilot_actions',     'applied_by'],
  ]
  for (const [table, col] of ownerCols) {
    await query(`
      DO $$
      DECLARE c text;
      BEGIN
        FOR c IN
          SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema   = tc.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY'
             AND tc.table_name = '${table}'
             AND kcu.column_name = '${col}'
        LOOP
          EXECUTE format('ALTER TABLE ${table} DROP CONSTRAINT %I', c);
        END LOOP;
      END $$;
    `).catch(() => {})
  }

  // ── Data-leak seal: deny-by-default RLS on every app table ────────────────
  // Supabase auto-exposes public-schema tables over its REST API (PostgREST)
  // using the *publishable* key, which ships to the browser. With RLS enabled
  // and no permissive policy, that API returns zero rows to anon/authenticated
  // callers — so nobody can read another user's connections/profiles/issues by
  // hitting the Supabase REST endpoint directly. The app is unaffected because
  // it connects as the table owner (POSTGRES_*), which bypasses RLS.
  const rlsTables = [
    'profiles', 'users', 'monitored_connections', 'detected_issues',
    'autopilot_rules', 'autopilot_actions', 'query_plans',
    'backup_history', 'audit_log',
  ]
  for (const t of rlsTables) {
    await query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`).catch(() => {})
  }
  // Remove the legacy permissive policy that explicitly allowed reads.
  await query(`DROP POLICY IF EXISTS p_issues_visibility ON detected_issues`).catch(() => {})

  // Some installs typed severity/issue_type as custom enums that don't contain
  // the values the scanner emits (e.g. enum severity missing 'warning'). Extend
  // those enums to cover every value the app uses. No-ops if the column is plain
  // text or the value already exists. (ALTER TYPE ADD VALUE is autocommitted.)
  const severityVals = ['critical', 'high', 'warning', 'medium', 'info', 'low']
  for (const v of severityVals) {
    await query(`ALTER TYPE severity ADD VALUE IF NOT EXISTS '${v}'`).catch(() => {})
  }
  const issueTypeVals = [
    'low_cache_hit', 'idle_in_transaction', 'table_bloat', 'missing_index',
    'slow_query', 'long_transaction', 'lock_contention', 'deadlock',
    'idle_connections', 'unused_index',
  ]
  for (const v of issueTypeVals) {
    await query(`ALTER TYPE issue_type ADD VALUE IF NOT EXISTS '${v}'`).catch(() => {})
  }

  // detected_issues — every column the scan engine / API reads or writes.
  // Older installs are missing a number of these (source, resolution_notes, …).
  const issueCols: [string, string][] = [
    ['issue_type',       `text`],
    ['severity',         `text NOT NULL DEFAULT 'info'`],
    ['title',            `text`],
    ['description',      `text`],
    ['affected_table',   `text`],
    ['affected_query',   `text`],
    ['is_resolved',      `boolean NOT NULL DEFAULT FALSE`],
    ['resolved_by',      `uuid`],
    ['resolution_notes', `text`],
    ['resolved_at',      `timestamptz`],
    ['source',           `text NOT NULL DEFAULT 'manual'`],
    ['fingerprint',      `text`],
    ['detected_at',      `timestamptz NOT NULL DEFAULT NOW()`],
  ]
  for (const [col, def] of issueCols) {
    await query(`ALTER TABLE detected_issues ADD COLUMN IF NOT EXISTS ${col} ${def}`).catch(() => {})
  }
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_open_fingerprint
       ON detected_issues (connection_id, fingerprint)
       WHERE is_resolved = FALSE AND fingerprint IS NOT NULL`
  ).catch(() => {})

  // query_plans — every column the planner/diff/JSON screens read or write.
  const planCols: [string, string][] = [
    ['query_hash',     `text`],
    ['plan_json',      `jsonb`],
    ['plan_type',      `text NOT NULL DEFAULT 'before_fix'`],
    ['total_cost',     `numeric`],
    ['execution_ms',   `numeric`],
    ['rows_examined',  `bigint`],
    ['has_seq_scan',   `boolean DEFAULT FALSE`],
    ['has_index_scan', `boolean DEFAULT FALSE`],
    ['related_issue',  `uuid`],
    ['captured_at',    `timestamptz NOT NULL DEFAULT NOW()`],
  ]
  for (const [col, def] of planCols) {
    await query(`ALTER TABLE query_plans ADD COLUMN IF NOT EXISTS ${col} ${def}`).catch(() => {})
  }

  // backup_history — store the logical snapshot inline so hosted (serverless)
  // backups survive without writing to the (read-only/ephemeral) filesystem.
  await query(`ALTER TABLE backup_history ADD COLUMN IF NOT EXISTS snapshot jsonb`).catch(() => {})

  // Seed starter rules (non-critical — never let it abort the migration).
  await seedRules()
}

// Seed a few starter rules if the table is empty. autopilot_rules.issue_type is
// `text` in the bundled schema but a custom enum in some installs, so we insert
// via parameters (unknown type → server coerces to either) and swallow errors.
async function seedRules(): Promise<void> {
  try {
    const rows = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM autopilot_rules`)
    if (rows[0]?.n > 0) return

    const seeds = [
      ['Index sequential scans', 'missing_index', 'Seq Scan on table > 1k rows',    'CREATE INDEX on the scanned column', 'suggest'],
      ['Vacuum bloated tables',  'table_bloat',   'Dead tuples > 20% of live tuples', 'Run VACUUM ANALYZE on the table',    'auto'],
      ['Flag slow queries',      'slow_query',    'mean_exec_time > 1000 ms',         'Capture EXPLAIN ANALYZE for review', 'suggest'],
    ]
    for (const [name, issueType, trigger, action, mode] of seeds) {
      await query(
        `INSERT INTO autopilot_rules (name, issue_type, trigger_condition, action_description, mode)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, issueType, trigger, action, mode]
      ).catch(() => {})
    }
  } catch { /* seeding is best-effort */ }
}

export function ensureSchema(): Promise<void> {
  if (!ran) ran = migrate().catch((err) => {
    // Don't permanently cache a failure — allow a retry on the next request.
    ran = null
    console.error('[ensureSchema] migration failed:', err)
    throw err
  })
  return ran
}
