import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getSupabaseAdmin } from '@/lib/supabase'
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

      // Index usage stats
      const indexUsage = await queryExternal<any>(connectionId, `
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan ASC
        LIMIT 20
      `)

      // Table stats
      const tableStats = await queryExternal<any>(connectionId, `
        SELECT
          tablename,
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
      const { data: summary, error: fetchError } = await supabaseAdmin
        .from('v_connection_health')
        .select('*')
      if (fetchError) throw fetchError
      return ok(summary)
    }

    // ── PERFORMANCE TREND (24h) ───────────────────────────
    if (type === 'trend') {
      if (!connectionId) return error('Missing connectionId')

      const { data: trend, error: trendError } = await supabaseAdmin
        .from('v_performance_trend_24h')
        .select('*')
        .eq('connection_id', connectionId)
      if (trendError) throw trendError
      return ok(trend)
    }

    // ── ISSUE SUMMARY ─────────────────────────────────────
    if (type === 'issues') {
      const queryBuilder = supabaseAdmin
        .from('detected_issues')
        .select(`issue_type,severity,
          total:count(*),
          resolved:count(is_resolved),
          open:count(!is_resolved),
          avg_resolution_mins`)
      // For complex aggregates, fall back to a simplified summary
      if (connectionId) queryBuilder.eq('connection_id', connectionId)

      const { data: issueSummary, error: fetchError } = await queryBuilder
      if (fetchError) {
        // If the Supabase query fails because of unsupported aggregation syntax,
        // fallback to the original SQL query for accuracy.
        const params: any[] = []
        let whereClause = ''

        if (connectionId) {
          params.push(connectionId)
          whereClause = `WHERE connection_id = $1`
        }

        const fallbackIssueSummary = await query<any>(
          `SELECT
             issue_type,
             severity,
             COUNT(*)                                      AS total,
             COUNT(*) FILTER (WHERE is_resolved = TRUE)   AS resolved,
             COUNT(*) FILTER (WHERE is_resolved = FALSE)  AS open,
             ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 60), 2) AS avg_resolution_mins
           FROM detected_issues
           ${whereClause}
           GROUP BY issue_type, severity
           ORDER BY total DESC`,
          params
        )
        return ok(fallbackIssueSummary)
      }

      return ok(issueSummary)
    }

    return error('Invalid type. Use performance, health, trend or issues')
  } catch (err) {
    return serverError(err)
  }
}