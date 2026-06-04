import { query } from './pool'

// Self-healing app schema. Some installs were created from an older schema.sql
// and are missing columns/indexes the app now relies on (e.g. detected_issues.source,
// which surfaced as "column source does not exist" during a scan). This runs the
// critical idempotent migrations once per process so the app works without the
// operator having to re-run db/schema.sql by hand.
let ran: Promise<void> | null = null

async function migrate(): Promise<void> {
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
