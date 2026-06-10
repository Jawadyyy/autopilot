import { NextRequest } from 'next/server'
import { query } from '@/lib/db/pool'
import { getAuthUser, ownedConnectionIds } from '@/lib/auth/jwt'
import { ok, unauthorized, serverError } from '@/lib/utils/response'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const severity = req.nextUrl.searchParams.get('severity')
    const filterBySeverity = severity && severity !== 'all'

    // Scope to the caller's own connections (null = admin → all).
    const ids = await ownedConnectionIds(authUser)
    const scoped = ids !== null

    const where: string[] = []
    const params: any[] = []
    if (scoped)          { params.push(ids);      where.push(`connection_id = ANY($${params.length})`) }
    if (filterBySeverity) { params.push(severity); where.push(`severity = $${params.length}`) }

    const data = await query(
      `SELECT id, detected_at, detected_at AS timestamp, severity, title,
              description, affected_table, affected_query, issue_type, is_resolved
         FROM detected_issues
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY detected_at DESC
        LIMIT 100`,
      params.length ? params : undefined
    )

    return ok(data)
  } catch (err) {
    return serverError(err)
  }
}
