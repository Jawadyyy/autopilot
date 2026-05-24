import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, unauthorized, serverError, error } from '@/lib/utils/response'

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
    schemaname, tablename,
    n_dead_tup, n_live_tup,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS bloat_pct,
    last_vacuum, last_autovacuum
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 1000
  ORDER BY bloat_pct DESC NULLIF
  LIMIT 20
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

// GET /api/monitor?connectionId=xxx&type=slow_queries|locks|deadlocks|bloat|metrics
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

// POST /api/monitor — manually trigger issue logging
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const { connectionId } = await req.json()
    if (!connectionId) return error('Missing connectionId')

    // Run all checks and log issues via stored procedure
    await query(
      `CALL sp_log_issue($1, $2, $3, $4, $5)`,
      [connectionId, 'slow_query', 'medium', 'Manual scan triggered', 'User triggered a manual monitoring scan']
    )

    return ok({ message: 'Monitoring scan triggered' })
  } catch (err) {
    return serverError(err)
  }
}