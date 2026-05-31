import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, error, unauthorized, serverError } from '@/lib/utils/response'

// GET /api/reports?type=performance|health|summary&connectionId=xxx
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const type         = req.nextUrl.searchParams.get('type') || 'summary'
    const connectionId = req.nextUrl.searchParams.get('connectionId')

    // ── PERFORMANCE REPORT ────────────────────────────────
    if (type === 'performance') {
      if (!connectionId) return error('Missing connectionId')

      // Top 10 slow queries from pg_stat_statements on external DB
      const slowQueries = await queryExternal<any>(connectionId, `
        SELECT
          LEFT(query, 300)        AS query,
          calls,
          ROUND(mean_exec_time::numeric, 2) AS mean_ms,
          ROUND(max_exec_time::numeric, 2)  AS max_ms,
          ROUND(total_exec_time::numeric, 2) AS total_ms,
          rows
        FROM pg_stat_statements
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `)

      // Index usage stats (pg_stat_user_indexes exposes relname/indexrelname)
      const indexUsage = await queryExternal<any>(connectionId, `
        SELECT
          schemaname,
          relname      AS tablename,
          indexrelname AS indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan ASC
        LIMIT 20
      `)

      // Table stats (pg_stat_user_tables exposes relname, not tablename)
      const tableStats = await queryExternal<any>(connectionId, `
        SELECT
          relname AS tablename,
          seq_scan,
          idx_scan,
          n_live_tup,
          n_dead_tup,
          ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS bloat_pct
        FROM pg_stat_user_tables
        ORDER BY seq_scan DESC
        LIMIT 20
      `)

      // Health score from our DB
      const healthScore = await queryOne<any>(
        `SELECT fn_compute_health_score($1) AS score`, [connectionId]
      )

      // Autopilot fixes applied for this connection
      const fixes = await query<any>(
        `SELECT
           a.action_type,
           a.status,
           a.applied_at,
           a.outcome_notes,
           i.affected_table
         FROM autopilot_actions a
         JOIN detected_issues i ON i.id = a.issue_id
         WHERE i.connection_id = $1
           AND a.status = 'applied'
         ORDER BY a.applied_at DESC
         LIMIT 20`,
        [connectionId]
      )

      return ok({ slowQueries, indexUsage, tableStats, healthScore: healthScore?.score, fixes })
    }

    // ── HEALTH SUMMARY (all connections) ──────────────────
    if (type === 'health') {
      const summary = await query(`SELECT * FROM v_connection_health`)
      return ok(summary)
    }

    // ── PERFORMANCE TREND (24h) ───────────────────────────
    if (type === 'trend') {
      if (!connectionId) return error('Missing connectionId')

      const trend = await query(
        `SELECT * FROM v_performance_trend_24h WHERE connection_id = $1`,
        [connectionId]
      )
      return ok(trend)
    }

    // ── ISSUE SUMMARY ─────────────────────────────────────
    if (type === 'issues') {
      const issueSummary = await query<any>(
        `SELECT
           issue_type,
           severity,
           COUNT(*)                                      AS total,
           COUNT(*) FILTER (WHERE is_resolved = TRUE)   AS resolved,
           COUNT(*) FILTER (WHERE is_resolved = FALSE)  AS open,
           ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 60), 2) AS avg_resolution_mins
         FROM detected_issues
         ${connectionId ? 'WHERE connection_id = $1' : ''}
         GROUP BY issue_type, severity
         ORDER BY total DESC`,
        connectionId ? [connectionId] : undefined
      )
      return ok(issueSummary)
    }

    return error('Invalid type. Use performance, health, trend or issues')
  } catch (err) {
    return serverError(err)
  }
}