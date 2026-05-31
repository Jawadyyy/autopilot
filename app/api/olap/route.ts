import { NextRequest } from 'next/server'
import { queryMssql } from '@/lib/db/mssql'
import { query } from '@/lib/db/pool'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, error, unauthorized, forbidden, serverError } from '@/lib/utils/response'
import { z } from 'zod'

function severityLevel(sev: string): number {
  switch (sev) {
    case 'critical': return 4
    case 'high':     return 3
    case 'warning': case 'medium': return 2
    default:        return 1
  }
}

// ETL: load the MSSQL star schema from the PostgreSQL OLTP detected_issues.
// Idempotent — facts are keyed by source_issue_id and skipped if already loaded.
async function runEtl(): Promise<{ processed: number }> {
  const rows = await query<any>(`
    SELECT i.id, i.issue_type, i.severity, i.is_resolved, i.detected_at, i.resolved_at,
           c.id AS conn_id, c.name AS db_name, c.db_type, c.host
      FROM detected_issues i
      JOIN monitored_connections c ON c.id = i.connection_id
     ORDER BY i.detected_at DESC
     LIMIT 1000
  `)

  for (const r of rows) {
    const d = new Date(r.detected_at)
    const fullDate = d.toISOString().slice(0, 10)
    const hour = d.getUTCHours()
    const month = d.getUTCMonth() + 1
    const resMin = r.resolved_at
      ? Math.max(0, Math.round((new Date(r.resolved_at).getTime() - d.getTime()) / 60000))
      : null

    await queryMssql(
      `IF NOT EXISTS (SELECT 1 FROM dim_database WHERE source_id = @sid)
         INSERT INTO dim_database (source_id, database_name, db_type, host)
         VALUES (@sid, @name, @type, @host)`,
      { sid: r.conn_id, name: r.db_name, type: r.db_type, host: r.host }
    )
    await queryMssql(
      `IF NOT EXISTS (SELECT 1 FROM dim_issue_type WHERE issue_category = @cat)
         INSERT INTO dim_issue_type (issue_category) VALUES (@cat)`,
      { cat: r.issue_type }
    )
    await queryMssql(
      `IF NOT EXISTS (SELECT 1 FROM dim_time WHERE full_date = @fd AND hour_of_day = @h)
         INSERT INTO dim_time (full_date, hour_of_day, day_of_week, month_num, quarter_num, year_num)
         VALUES (@fd, @h, @dow, @mon, @q, @yr)`,
      { fd: fullDate, h: hour, dow: d.getUTCDay(), mon: month, q: Math.floor((month - 1) / 3) + 1, yr: d.getUTCFullYear() }
    )
    await queryMssql(
      `INSERT INTO fact_incidents
         (source_issue_id, database_id, issue_type_id, time_id, severity_level, is_resolved, fix_success, resolution_minutes, detected_at)
       SELECT @iid,
         (SELECT database_id FROM dim_database WHERE source_id = @sid),
         (SELECT issue_type_id FROM dim_issue_type WHERE issue_category = @cat),
         (SELECT TOP 1 time_id FROM dim_time WHERE full_date = @fd AND hour_of_day = @h),
         @sev, @res, @fix, @resmin, @det
       WHERE NOT EXISTS (SELECT 1 FROM fact_incidents WHERE source_issue_id = @iid)`,
      {
        iid: r.id, sid: r.conn_id, cat: r.issue_type, fd: fullDate, h: hour,
        sev: severityLevel(r.severity), res: r.is_resolved ? 1 : 0,
        fix: r.is_resolved ? 1 : 0, resmin: resMin, det: d,
      }
    )
  }

  return { processed: rows.length }
}

const CubeSchema = z.object({
  dimensions: z.array(z.enum(['issue_type', 'db_name', 'hour', 'day', 'severity', 'fix_type'])).min(1),
  measures:   z.array(z.enum(['total_incidents', 'resolved_count', 'avg_resolution_mins', 'fix_success_rate'])).min(1),
  filters: z.object({
    startDate:  z.string().optional(),
    endDate:    z.string().optional(),
    dbName:     z.string().optional(),
    issueType:  z.string().optional(),
  }).optional(),
})

// Map dimension names to actual MSSQL column names
const DIM_MAP: Record<string, string> = {
  issue_type: 'dit.issue_category',
  db_name:    'dd.database_name',
  hour:       'dt.hour_of_day',
  day:        'dt.day_of_week',
  severity:   'fi.severity_level',
  fix_type:   'dft.fix_type_name',
}

const MEASURE_MAP: Record<string, string> = {
  total_incidents:      'COUNT(fi.incident_id)',
  resolved_count:       'SUM(fi.is_resolved)',
  avg_resolution_mins:  'AVG(fi.resolution_minutes)',
  fix_success_rate:     'ROUND(AVG(CAST(fi.fix_success AS FLOAT)) * 100, 2)',
}

// GET /api/olap?type=heatmap|trend|pivot|summary
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const type = req.nextUrl.searchParams.get('type') || 'summary'

    // ── HEATMAP — incidents by hour vs day ────────────────
    if (type === 'heatmap') {
      const data = await queryMssql<any>(`
        SELECT
          dt.hour_of_day,
          dt.day_of_week,
          COUNT(fi.incident_id) AS incident_count,
          AVG(fi.severity_level) AS avg_severity
        FROM fact_incidents fi
        JOIN dim_time dt ON dt.time_id = fi.time_id
        GROUP BY dt.hour_of_day, dt.day_of_week
        ORDER BY dt.day_of_week, dt.hour_of_day
      `)
      return ok(data)
    }

    // ── TREND — incidents over time ───────────────────────
    if (type === 'trend') {
      const days = req.nextUrl.searchParams.get('days') || '30'
      const data = await queryMssql<any>(`
        SELECT
          CAST(dt.full_date AS DATE)     AS date,
          dit.issue_category             AS issue_type,
          COUNT(fi.incident_id)          AS total,
          SUM(fi.is_resolved)            AS resolved,
          AVG(fi.resolution_minutes)     AS avg_resolution_mins
        FROM fact_incidents fi
        JOIN dim_time     dt  ON dt.time_id   = fi.time_id
        JOIN dim_issue_type dit ON dit.issue_type_id = fi.issue_type_id
        WHERE dt.full_date >= DATEADD(day, -@days, GETDATE())
        GROUP BY CAST(dt.full_date AS DATE), dit.issue_category
        ORDER BY date ASC
      `, { days: parseInt(days) })
      return ok(data)
    }

    // ── SUMMARY — overall stats ───────────────────────────
    if (type === 'summary') {
      const data = await queryMssql<any>(`
        SELECT
          COUNT(fi.incident_id)                              AS total_incidents,
          SUM(fi.is_resolved)                               AS total_resolved,
          ROUND(AVG(CAST(fi.fix_success AS FLOAT)) * 100, 2) AS fix_success_rate,
          AVG(fi.resolution_minutes)                        AS avg_resolution_mins,
          COUNT(DISTINCT fi.database_id)                    AS databases_monitored
        FROM fact_incidents fi
      `)
      return ok(data[0])
    }

    return error('Invalid type. Use heatmap, trend, pivot or summary')
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/olap — dynamic CUBE/ROLLUP query builder
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    // Run the OLTP → OLAP ETL pipeline
    if (req.nextUrl.searchParams.get('action') === 'etl') {
      if (!hasRole(authUser.role, 'db_admin')) return forbidden()
      const result = await runEtl()
      return ok({ message: `ETL complete — ${result.processed} incident(s) processed`, ...result })
    }

    const body   = await req.json()
    const parsed = CubeSchema.safeParse(body)
    if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

    const { dimensions, measures, filters } = parsed.data

    // Build SELECT columns
    const selectCols = [
      ...dimensions.map(d => `${DIM_MAP[d]} AS ${d}`),
      ...measures.map(m => `${MEASURE_MAP[m]} AS ${m}`),
    ].join(',\n          ')

    // Build GROUP BY CUBE
    const groupCols = dimensions.map(d => DIM_MAP[d]).join(', ')

    // Build WHERE clause with parameter placeholders (mssql named params) so
    // filter values can never be interpolated into the SQL string directly.
    const whereClauses: string[] = []
    const params: Record<string, any> = {}
    if (filters?.startDate) { whereClauses.push(`dt.full_date >= @startDate`); params.startDate = filters.startDate }
    if (filters?.endDate)   { whereClauses.push(`dt.full_date <= @endDate`);   params.endDate   = filters.endDate }
    if (filters?.dbName)    { whereClauses.push(`dd.database_name = @dbName`);  params.dbName    = filters.dbName }
    if (filters?.issueType) { whereClauses.push(`dit.issue_category = @issueType`); params.issueType = filters.issueType }

    const whereSQL = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : ''

    // Final CUBE query — Week 12
    const sql = `
      SELECT
          ${selectCols}
        FROM fact_incidents fi
        JOIN dim_database   dd  ON dd.database_id    = fi.database_id
        JOIN dim_issue_type dit ON dit.issue_type_id = fi.issue_type_id
        JOIN dim_time       dt  ON dt.time_id        = fi.time_id
        JOIN dim_fix_type   dft ON dft.fix_type_id   = fi.fix_type_id
        ${whereSQL}
        GROUP BY CUBE(${groupCols})
        ORDER BY ${dimensions.map(d => DIM_MAP[d]).join(', ')}
    `

    const data = await queryMssql<any>(sql, params)

    return ok({ sql, data })
  } catch (err) {
    return serverError(err)
  }
}