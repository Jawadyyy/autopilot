import { NextRequest } from 'next/server'
import { query } from '@/lib/db/pool'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, unauthorized, serverError } from '@/lib/utils/response'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const [connections, events, severityCounts] = await Promise.all([
      query<any>(
        `SELECT id, name, host, db_name, db_type, status, last_checked_at
           FROM monitored_connections
          ORDER BY created_at DESC`
      ),
      query<any>(
        `SELECT id, detected_at, detected_at AS timestamp, severity, title,
                description, affected_table, affected_query, issue_type, is_resolved
           FROM detected_issues
          ORDER BY detected_at DESC
          LIMIT 8`
      ),
      query<{ severity: string; count: string }>(
        `SELECT severity, COUNT(*) AS count
           FROM detected_issues
          WHERE is_resolved = FALSE
          GROUP BY severity`
      ),
    ])

    // Derive a simple 0-100 health score from unresolved issue severity.
    const counts = Object.fromEntries(severityCounts.map((r) => [r.severity, Number(r.count)]))
    const critical = counts.critical ?? 0
    const warning  = counts.warning ?? 0
    const info     = counts.info ?? 0
    const activeAlerts = critical + warning + info
    const healthScore = Math.max(0, 100 - critical * 15 - warning * 5 - info * 1)

    // Distinct database engines being monitored (stand-in for "regions").
    const regionCount = new Set(connections.map((c) => c.db_type)).size

    const clusters = connections.map((row) => ({
      id: row.id,
      name: row.name || row.db_name || `cluster-${row.id}`,
      status: row.status === 'active' ? 'healthy' : 'warning',
      db_type: row.db_type,
      last_checked_at: row.last_checked_at,
      connections: [(row.name ?? row.db_name) as string],
    }))

    return ok({
      summary: {
        databaseCount: connections.length,
        regionCount,
        activeAlerts,
        // Per-query latency requires probing each external DB; not computed here.
        avgLatencyMs: null,
        healthScore,
      },
      clusters,
      events,
    })
  } catch (err) {
    return serverError(err)
  }
}
