import { NextRequest } from 'next/server'
import { query } from '@/lib/db/pool'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, unauthorized, serverError } from '@/lib/utils/response'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const severity = req.nextUrl.searchParams.get('severity')

    const filterBySeverity = severity && severity !== 'all'
    const data = await query(
      `SELECT id, detected_at, detected_at AS timestamp, severity, title,
              description, affected_table, affected_query, issue_type, is_resolved
         FROM detected_issues
        ${filterBySeverity ? 'WHERE severity = $1' : ''}
        ORDER BY detected_at DESC
        LIMIT 100`,
      filterBySeverity ? [severity] : undefined
    )

    return ok(data)
  } catch (err) {
    return serverError(err)
  }
}
