import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal, queryExternalMssql } from '@/lib/db/connections'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, unauthorized, forbidden, serverError, error } from '@/lib/utils/response'
import { broadcast } from '@/lib/realtime'

// Queries run against external PostgreSQL databases
const SLOW_QUERY_SQL = `
  SELECT query, calls, mean_exec_time, max_exec_time, total_exec_time, rows
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC
  LIMIT 20
`

const LOCK_SQL = `
  SELECT
    pid, usename, application_name, state,
    wait_event_type, wait_event,
    query_start, state_change,
    LEFT(query, 200) AS query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY query_start ASC
`

const DEADLOCK_SQL = `
  SELECT
    blocked.pid     AS blocked_pid,
    blocked.usename AS blocked_user,
    blocking.pid    AS blocking_pid,
    blocking.usename AS blocking_user,
    LEFT(blocked.query, 200)  AS blocked_query,
    LEFT(blocking.query, 200) AS blocking_query
  FROM pg_stat_activity blocked
  JOIN pg_stat_activity blocking
    ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
  WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0
`

const TABLE_BLOAT_SQL = `
  SELECT
    schemaname,
    relname AS tablename,
    n_dead_tup, n_live_tup,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS bloat_pct,
    last_vacuum, last_autovacuum
  FROM pg_stat_user_tables
  ORDER BY bloat_pct DESC NULLS LAST, n_live_tup DESC
  LIMIT 50
`

const METRICS_SQL = `
  SELECT
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')  AS active_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle')    AS idle_connections,
    (SELECT ROUND(sum(blks_hit)::numeric / NULLIF(sum(blks_hit) + sum(blks_read), 0) * 100, 4)
     FROM pg_stat_database)                                          AS cache_hit_ratio,
    (SELECT ROUND(AVG(mean_exec_time)::numeric, 4)
     FROM pg_stat_statements)                                        AS avg_query_ms,
    (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000) AS slow_query_count
`

// ── Live scan engine ─────────────────────────────────────────────────────
// Runs a battery of read-only checks against the external PostgreSQL database
// and synthesises a list of issues with severity + how to counter each one.
// Every check is wrapped so a missing extension / permission degrades the scan
// instead of failing it.

export type Severity = 'critical' | 'high' | 'warning' | 'info'

export interface ScanIssue {
  issue_type:     string
  severity:       Severity
  title:          string
  description:    string
  affected?:      string
  recommendation: string
  sql?:           string
  fingerprint:    string   // stable identity for dedupe/persistence
  autofix:        boolean  // sql is directly executable (no placeholders)
  safeAuto:       boolean  // safe to run unattended by an 'auto' rule
}

export interface ScanResult {
  connectionId: string
  scannedAt:    string
  healthScore:  number
  metrics: {
    active_connections: number | null
    idle_connections:   number | null
    idle_in_tx:         number | null
    cache_hit_ratio:    number | null
    avg_query_ms:       number | null
    slow_query_count:   number | null
  }
  issues: ScanIssue[]
}

const SEVERITY_PENALTY: Record<Severity, number> = { critical: 22, high: 13, warning: 6, info: 2 }

function ident(schema: string, table: string) {
  return `"${schema}"."${table}"`
}

async function runScan(connectionId: string): Promise<ScanResult> {
  const issues: ScanIssue[] = []
  const metrics: ScanResult['metrics'] = {
    active_connections: null, idle_connections: null, idle_in_tx: null,
    cache_hit_ratio: null, avg_query_ms: null, slow_query_count: null,
  }

  // Activity + cache metrics (no extension required)
  try {
    const m = await queryExternal<any>(connectionId, `
      SELECT
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')               AS active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle')                 AS idle_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction')  AS idle_in_tx,
        (SELECT ROUND(sum(blks_hit)::numeric / NULLIF(sum(blks_hit) + sum(blks_read), 0) * 100, 2)
           FROM pg_stat_database)                                                    AS cache_hit_ratio
    `)
    Object.assign(metrics, m[0] ?? {})
  } catch { /* metrics unavailable */ }

  // pg_stat_statements metrics (optional extension)
  try {
    const s = await queryExternal<any>(connectionId, `
      SELECT ROUND(AVG(mean_exec_time)::numeric, 2)                       AS avg_query_ms,
             COUNT(*) FILTER (WHERE mean_exec_time > 1000)                AS slow_query_count
        FROM pg_stat_statements
    `)
    if (s[0]) { metrics.avg_query_ms = s[0].avg_query_ms; metrics.slow_query_count = s[0].slow_query_count }
  } catch { /* pg_stat_statements not enabled */ }

  // Low cache hit ratio
  if (metrics.cache_hit_ratio != null) {
    const r = Number(metrics.cache_hit_ratio)
    if (r < 90) {
      issues.push({
        issue_type: 'low_cache_hit',
        severity: r < 80 ? 'high' : 'warning',
        title: 'Low buffer cache hit ratio',
        description: `Cache hit ratio is ${r}% — the database is reading from disk often.`,
        recommendation: 'Add indexes to cut sequential reads, or increase shared_buffers for the instance.',
        fingerprint: 'low_cache_hit',
        autofix: false, safeAuto: false,
      })
    }
  }

  // Idle-in-transaction sessions hold locks and bloat
  if (metrics.idle_in_tx != null && Number(metrics.idle_in_tx) > 0) {
    issues.push({
      issue_type: 'idle_in_transaction',
      severity: Number(metrics.idle_in_tx) > 3 ? 'warning' : 'info',
      title: `${metrics.idle_in_tx} idle-in-transaction session(s)`,
      description: 'Sessions left idle inside a transaction hold locks and prevent vacuum from cleaning dead rows.',
      recommendation: 'Commit/rollback promptly in the app, and set idle_in_transaction_session_timeout.',
      fingerprint: 'idle_in_transaction',
      autofix: false, safeAuto: false,
    })
  }

  // Table bloat
  try {
    const bloat = await queryExternal<any>(connectionId, `
      SELECT schemaname, relname AS tablename, n_dead_tup,
             ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS bloat_pct
        FROM pg_stat_user_tables
       WHERE n_dead_tup > 50
       ORDER BY bloat_pct DESC NULLS LAST
       LIMIT 5
    `)
    for (const t of bloat) {
      const pct = Number(t.bloat_pct)
      if (pct >= 20) {
        issues.push({
          issue_type: 'table_bloat',
          severity: pct >= 40 ? 'high' : 'warning',
          title: `Table bloat: ${t.tablename} (${pct}%)`,
          description: `${t.tablename} has ${t.n_dead_tup} dead tuples (${pct}% bloat), wasting space and slowing scans.`,
          affected: `${t.schemaname}.${t.tablename}`,
          recommendation: 'Reclaim dead tuples by running VACUUM ANALYZE on the table.',
          sql: `VACUUM (ANALYZE) ${ident(t.schemaname, t.tablename)};`,
          fingerprint: `table_bloat:${t.schemaname}.${t.tablename}`,
          autofix: true, safeAuto: true,
        })
      }
    }
  } catch { /* skip */ }

  // Sequential scans on large tables → missing index candidates
  try {
    const seq = await queryExternal<any>(connectionId, `
      SELECT schemaname, relname AS tablename, seq_scan, idx_scan, n_live_tup
        FROM pg_stat_user_tables
       WHERE seq_scan > 50 AND n_live_tup > 1000
         AND (idx_scan IS NULL OR seq_scan > idx_scan * 2)
       ORDER BY seq_scan DESC
       LIMIT 5
    `)
    for (const t of seq) {
      issues.push({
        issue_type: 'missing_index',
        severity: 'warning',
        title: `Frequent sequential scans: ${t.tablename}`,
        description: `${t.tablename} was sequentially scanned ${t.seq_scan} times (${Number(t.n_live_tup).toLocaleString()} rows). A supporting index is likely missing.`,
        affected: `${t.schemaname}.${t.tablename}`,
        recommendation: 'Find the filtered/joined column with EXPLAIN ANALYZE and add a B-tree index.',
        sql: `-- Confirm the scan, then index the filtered column:\nEXPLAIN ANALYZE SELECT * FROM ${ident(t.schemaname, t.tablename)} WHERE <column> = <value>;\nCREATE INDEX ON ${ident(t.schemaname, t.tablename)} (<column>);`,
        fingerprint: `missing_index:${t.schemaname}.${t.tablename}`,
        autofix: false, safeAuto: false,
      })
    }
  } catch { /* skip */ }

  // Slow queries (needs pg_stat_statements)
  try {
    const slow = await queryExternal<any>(connectionId, `
      SELECT LEFT(query, 160) AS query, calls,
             ROUND(mean_exec_time::numeric, 2) AS mean_ms
        FROM pg_stat_statements
       WHERE mean_exec_time > 500
       ORDER BY mean_exec_time DESC
       LIMIT 5
    `)
    for (const q of slow) {
      const mean = Number(q.mean_ms)
      issues.push({
        issue_type: 'slow_query',
        severity: mean > 2000 ? 'high' : 'warning',
        title: `Slow query (${mean}ms avg)`,
        description: `Called ${q.calls}× averaging ${mean}ms: ${q.query}`,
        recommendation: 'Capture the plan and add indexes, or rewrite the query to avoid full scans/sorts.',
        sql: `EXPLAIN (ANALYZE, BUFFERS) ${q.query};`,
        fingerprint: `slow_query:${q.query.slice(0, 80)}`,
        autofix: false, safeAuto: false,
      })
    }
  } catch { /* skip */ }

  // Long-running transactions
  try {
    const longTx = await queryExternal<any>(connectionId, `
      SELECT pid, usename, state,
             ROUND(EXTRACT(EPOCH FROM (now() - xact_start))::numeric, 0) AS xact_secs,
             LEFT(query, 160) AS query
        FROM pg_stat_activity
       WHERE xact_start IS NOT NULL
         AND now() - xact_start > interval '60 seconds'
       ORDER BY xact_start ASC
       LIMIT 5
    `)
    for (const t of longTx) {
      const secs = Number(t.xact_secs)
      issues.push({
        issue_type: 'long_transaction',
        severity: secs > 300 ? 'high' : 'warning',
        title: `Long-running transaction (PID ${t.pid}, ${secs}s)`,
        description: `Session ${t.pid} (${t.usename ?? 'unknown'}) has held a transaction open for ${secs}s: ${t.query}`,
        affected: `PID ${t.pid}`,
        recommendation: 'Commit/rollback the work, or terminate the session if it is stuck.',
        sql: `SELECT pg_terminate_backend(${t.pid});`,
        fingerprint: `long_transaction:${t.pid}`,
        autofix: true, safeAuto: false,
      })
    }
  } catch { /* skip */ }

  // Blocking locks / deadlock risk
  try {
    const locks = await queryExternal<any>(connectionId, `
      SELECT blocked.pid AS blocked_pid, blocking.pid AS blocking_pid,
             LEFT(blocked.query, 120) AS blocked_query
        FROM pg_stat_activity blocked
        JOIN pg_stat_activity blocking
          ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
       WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0
       LIMIT 5
    `)
    for (const l of locks) {
      issues.push({
        issue_type: 'lock_contention',
        severity: 'critical',
        title: `Lock contention: PID ${l.blocked_pid} blocked by ${l.blocking_pid}`,
        description: `Session ${l.blocked_pid} is waiting on a lock held by ${l.blocking_pid}: ${l.blocked_query}`,
        affected: `PID ${l.blocked_pid} ← ${l.blocking_pid}`,
        recommendation: 'Terminate the blocking session to release the lock and clear the wait chain.',
        sql: `SELECT pg_terminate_backend(${l.blocking_pid});`,
        fingerprint: `lock_contention:${l.blocking_pid}`,
        autofix: true, safeAuto: false,
      })
    }
  } catch { /* skip */ }

  const penalty = issues.reduce((sum, i) => sum + SEVERITY_PENALTY[i.severity], 0)
  const healthScore = Math.max(0, 100 - penalty)

  // Order most severe first
  const order: Record<Severity, number> = { critical: 0, high: 1, warning: 2, info: 3 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])

  return {
    connectionId,
    scannedAt: new Date().toISOString(),
    healthScore,
    metrics,
    issues,
  }
}

// MSSQL scan via dynamic management views (DMVs). Read-only; remediation is
// advisory only (no unattended auto-fix on MSSQL).
async function runScanMssql(connectionId: string): Promise<ScanResult> {
  const issues: ScanIssue[] = []
  const metrics: ScanResult['metrics'] = {
    active_connections: null, idle_connections: null, idle_in_tx: null,
    cache_hit_ratio: null, avg_query_ms: null, slow_query_count: null,
  }

  try {
    const m = await queryExternalMssql<any>(connectionId, `
      SELECT
        (SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE is_user_process = 1 AND status = 'running') AS active_connections,
        (SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE is_user_process = 1 AND status = 'sleeping') AS idle_connections,
        (SELECT CAST(cntr_value AS DECIMAL(5,2)) FROM sys.dm_os_performance_counters
          WHERE counter_name = 'Buffer cache hit ratio') AS cache_hit_ratio
    `)
    Object.assign(metrics, m[0] ?? {})
  } catch { /* metrics unavailable */ }

  // Blocking sessions
  try {
    const blocked = await queryExternalMssql<any>(connectionId, `
      SELECT TOP 5 s.session_id AS blocked_pid, s.blocking_session_id AS blocking_pid,
             CAST(t.text AS NVARCHAR(200)) AS query
        FROM sys.dm_exec_requests s
        CROSS APPLY sys.dm_exec_sql_text(s.sql_handle) t
       WHERE s.blocking_session_id <> 0
    `)
    for (const b of blocked) {
      issues.push({
        issue_type: 'lock_contention',
        severity: 'critical',
        title: `Blocking: session ${b.blocked_pid} blocked by ${b.blocking_pid}`,
        description: `Session ${b.blocked_pid} is blocked by ${b.blocking_pid}: ${b.query}`,
        affected: `SPID ${b.blocked_pid} <- ${b.blocking_pid}`,
        recommendation: 'Terminate the blocking session to release the lock.',
        sql: `KILL ${b.blocking_pid};`,
        fingerprint: `lock_contention:${b.blocking_pid}`,
        autofix: false, safeAuto: false,
      })
    }
  } catch { /* skip */ }

  // Expensive cached queries
  try {
    const slow = await queryExternalMssql<any>(connectionId, `
      SELECT TOP 5
             qs.execution_count AS calls,
             qs.total_elapsed_time / NULLIF(qs.execution_count,0) / 1000 AS mean_ms,
             SUBSTRING(t.text, 1, 160) AS query
        FROM sys.dm_exec_query_stats qs
        CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) t
       ORDER BY qs.total_elapsed_time DESC
    `)
    for (const q of slow) {
      const mean = Number(q.mean_ms)
      if (mean > 200) {
        issues.push({
          issue_type: 'slow_query',
          severity: mean > 1000 ? 'high' : 'warning',
          title: `Expensive query (${mean}ms avg)`,
          description: `Executed ${q.calls}× averaging ${mean}ms: ${q.query}`,
          recommendation: 'Review the execution plan and add covering indexes.',
          fingerprint: `slow_query:${String(q.query).slice(0, 80)}`,
          autofix: false, safeAuto: false,
        })
      }
    }
  } catch { /* skip */ }

  const penalty = issues.reduce((s, i) => s + SEVERITY_PENALTY[i.severity], 0)
  const order: Record<Severity, number> = { critical: 0, high: 1, warning: 2, info: 3 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])

  return { connectionId, scannedAt: new Date().toISOString(), healthScore: Math.max(0, 100 - penalty), metrics, issues }
}

// Persist a scan's findings into detected_issues: upsert current issues and
// auto-resolve previously-open scan issues that have cleared.
async function persistScanIssues(connectionId: string, issues: ScanIssue[]): Promise<void> {
  const fingerprints = issues.map((i) => i.fingerprint)

  await query(
    `UPDATE detected_issues
        SET is_resolved = TRUE, resolved_at = NOW(),
            resolution_notes = 'Auto-resolved: no longer detected'
      WHERE connection_id = $1 AND source = 'scan' AND is_resolved = FALSE
        AND NOT (fingerprint = ANY($2::text[]))`,
    [connectionId, fingerprints.length ? fingerprints : ['']]
  )

  for (const i of issues) {
    await query(
      `INSERT INTO detected_issues
         (connection_id, issue_type, severity, title, description, affected_table, source, fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, 'scan', $7)
       ON CONFLICT (connection_id, fingerprint) WHERE (is_resolved = FALSE AND fingerprint IS NOT NULL)
       DO UPDATE SET severity = EXCLUDED.severity, title = EXCLUDED.title,
                     description = EXCLUDED.description, detected_at = NOW()`,
      [connectionId, i.issue_type, i.severity, i.title, i.description, i.affected ?? null, i.fingerprint]
    )
  }
}

async function logAction(opts: {
  issueId?: string | null; ruleId?: string | null; actionType: string
  sql: string; status: 'applied' | 'failed'; userId?: string | null; notes?: string | null
}) {
  await query(
    `INSERT INTO autopilot_actions
       (issue_id, rule_id, action_type, sql_applied, status, applied_by, outcome_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [opts.issueId ?? null, opts.ruleId ?? null, opts.actionType, opts.sql, opts.status, opts.userId ?? null, opts.notes ?? null]
  ).catch(() => {})
}

// Evaluate active 'auto' rules against the scan. Only "safe" auto-fixes run
// unattended (e.g. VACUUM); destructive ones (terminate session) stay manual.
async function evaluateRules(connectionId: string, issues: ScanIssue[], userId?: string | null) {
  const rules = await query<any>(
    `SELECT id, name, issue_type FROM autopilot_rules WHERE is_active = TRUE AND mode = 'auto'`
  ).catch(() => [])
  const applied: { issue_type: string; affected?: string; sql: string }[] = []

  for (const issue of issues) {
    if (!issue.autofix || !issue.safeAuto || !issue.sql) continue
    const rule = rules.find((r: any) => r.issue_type === issue.issue_type)
    if (!rule) continue
    try {
      await queryExternal(connectionId, issue.sql)
      await query(
        `UPDATE detected_issues
            SET is_resolved = TRUE, resolved_at = NOW(),
                resolution_notes = 'Auto-fixed by rule: ' || $3
          WHERE connection_id = $1 AND fingerprint = $2 AND is_resolved = FALSE`,
        [connectionId, issue.fingerprint, rule.name]
      )
      await logAction({ ruleId: rule.id, actionType: issue.issue_type, sql: issue.sql, status: 'applied', userId, notes: `Auto: ${issue.title}` })
      applied.push({ issue_type: issue.issue_type, affected: issue.affected, sql: issue.sql })
      broadcast({ type: 'autofix', payload: { connectionId, issue_type: issue.issue_type, affected: issue.affected, rule: rule.name } })
    } catch (e: any) {
      await logAction({ ruleId: rule.id, actionType: issue.issue_type, sql: issue.sql, status: 'failed', userId, notes: e?.message })
    }
  }
  return applied
}

// GET /api/monitor?connectionId=xxx&type=slow_queries|locks|deadlocks|bloat|metrics|scan
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const connectionId = req.nextUrl.searchParams.get('connectionId')
    const type         = req.nextUrl.searchParams.get('type') || 'metrics'

    if (!connectionId) return error('Missing connectionId')

    // Verify connection exists and is active
    const conn = await queryOne<any>(
      `SELECT id, db_type, status FROM monitored_connections WHERE id = $1`,
      [connectionId]
    )
    if (!conn)              return error('Connection not found', 404)
    if (conn.status === 'paused') return error('Connection is paused', 400)

    // Full live scan — issues + remediation + health score
    if (type === 'scan') {
      const result = conn.db_type === 'postgresql'
        ? await runScan(connectionId)
        : await runScanMssql(connectionId)
      await query(
        `UPDATE monitored_connections SET last_checked_at = NOW(), status = 'active' WHERE id = $1`,
        [connectionId]
      ).catch(() => {})
      return ok(result)
    }

    let data: any

    if (conn.db_type === 'postgresql') {
      switch (type) {
        case 'slow_queries':
          data = await queryExternal(connectionId, SLOW_QUERY_SQL)
          break
        case 'locks':
          data = await queryExternal(connectionId, LOCK_SQL)
          break
        case 'deadlocks':
          data = await queryExternal(connectionId, DEADLOCK_SQL)
          break
        case 'bloat':
          data = await queryExternal(connectionId, TABLE_BLOAT_SQL)
          break
        case 'metrics':
          data = await queryExternal(connectionId, METRICS_SQL)
          data = data[0] // single row
          break
        default:
          return error('Invalid type')
      }
    } else {
      return error('MSSQL monitoring coming soon', 400)
    }

    // Update last_checked_at
    await query(
      `UPDATE monitored_connections SET last_checked_at = NOW(), status = 'active' WHERE id = $1`,
      [connectionId]
    )

    return ok({ type, connectionId, data })
  } catch (err: any) {
    // Mark connection as error if we can't reach it
    const connectionId = new URL(req.url).searchParams.get('connectionId')
    if (connectionId) {
      await query(
        `UPDATE monitored_connections SET status = 'error', last_error = $1 WHERE id = $2`,
        [err.message, connectionId]
      ).catch(() => {})
    }
    return serverError(err)
  }
}

// POST /api/monitor?action=scan|apply_fix
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const action = req.nextUrl.searchParams.get('action') || 'scan'
    const body   = await req.json()
    const { connectionId } = body
    if (!connectionId) return error('Missing connectionId')

    const conn = await queryOne<any>(
      `SELECT id, db_type, status FROM monitored_connections WHERE id = $1`,
      [connectionId]
    )
    if (!conn) return error('Connection not found', 404)

    // ── APPLY FIX — execute a remediation statement on the target DB ──────
    if (action === 'apply_fix') {
      if (!hasRole(authUser.role, 'db_operator')) return forbidden()
      const { sql, issue_type, fingerprint, title } = body
      if (!sql) return error('Missing sql to apply')
      if (conn.db_type !== 'postgresql') return error('Apply fix is available for PostgreSQL only', 400)

      try {
        await queryExternal(connectionId, sql)
      } catch (e: any) {
        await logAction({ actionType: issue_type || 'manual_fix', sql, status: 'failed', userId: authUser.userId, notes: e?.message })
        return error(`Fix failed: ${e?.message ?? 'unknown error'}`, 400)
      }

      // Resolve the matching open issue if we know its fingerprint
      if (fingerprint) {
        await query(
          `UPDATE detected_issues
              SET is_resolved = TRUE, resolved_at = NOW(),
                  resolved_by = $3, resolution_notes = 'Fix applied by operator'
            WHERE connection_id = $1 AND fingerprint = $2 AND is_resolved = FALSE`,
          [connectionId, fingerprint, authUser.userId]
        ).catch(() => {})
      }
      await logAction({ actionType: issue_type || 'manual_fix', sql, status: 'applied', userId: authUser.userId, notes: title ?? null })
      broadcast({ type: 'fix_applied', payload: { connectionId, issue_type, title, by: authUser.username } })

      return ok({ message: 'Fix applied successfully' })
    }

    // ── SCAN — run checks, persist issues, fire auto rules ───────────────
    if (action === 'scan') {
      if (conn.status === 'paused') return error('Connection is paused', 400)

      const result = conn.db_type === 'postgresql'
        ? await runScan(connectionId)
        : await runScanMssql(connectionId)
      await persistScanIssues(connectionId, result.issues)
      // Auto-rules only run for PostgreSQL (remediation executes via queryExternal).
      const autoApplied = conn.db_type === 'postgresql'
        ? await evaluateRules(connectionId, result.issues, authUser.userId)
        : []

      await query(
        `UPDATE monitored_connections SET last_checked_at = NOW(), status = 'active' WHERE id = $1`,
        [connectionId]
      ).catch(() => {})

      if (result.issues.some((i) => i.severity === 'critical')) {
        broadcast({ type: 'scan', payload: { connectionId, critical: result.issues.filter((i) => i.severity === 'critical').length } })
      }

      return ok({ ...result, autoApplied })
    }

    return error('Invalid action. Use scan or apply_fix')
  } catch (err) {
    return serverError(err)
  }
}