import { NextRequest } from 'next/server'
import { queryMssql } from '@/lib/db/mssql'
import { query } from '@/lib/db/pool'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, error, unauthorized, serverError } from '@/lib/utils/response'
import { z } from 'zod'

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

    // Build WHERE clause
    const whereClauses: string[] = []
    if (filters?.startDate)  whereClauses.push(`dt.full_date >= '${filters.startDate}'`)
    if (filters?.endDate)    whereClauses.push(`dt.full_date <= '${filters.endDate}'`)
    if (filters?.dbName)     whereClauses.push(`dd.database_name = '${filters.dbName}'`)
    if (filters?.issueType)  whereClauses.push(`dit.issue_category = '${filters.issueType}'`)

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

    const data = await queryMssql<any>(sql)

    return ok({ sql, data })
  } catch (err) {
    return serverError(err)
  }
}