import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, forbidden, notFound, serverError } from '@/lib/utils/response'
import { testConnection, removePool } from '@/lib/db/connections'
import { encrypt } from '@/lib/utils/crypto'
import { z } from 'zod'

const ConnectionSchema = z.object({
  name:     z.string().min(1).max(255),
  host:     z.string().min(1),
  port:     z.number().int().min(1).max(65535),
  db_name:  z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  db_type:  z.enum(['postgresql', 'mssql']),
})

// GET /api/connections — list all connections
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const data = await query(
      `SELECT id, name, host, port, db_name, username, db_type, status,
              last_checked_at, last_error, created_at
         FROM monitored_connections
        ORDER BY created_at DESC`
    )
    return ok(data)
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/connections — register a new connection
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_operator')) return forbidden()

    const body   = await req.json()
    const action = req.nextUrl.searchParams.get('action')

    const parsed = ConnectionSchema.safeParse(body)
    if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

    const { name, host, port, db_name, username, password, db_type } = parsed.data

    // ── TEST only (don't save) ────────────────────────────
    if (action === 'test') {
      const result = await testConnection(host, port, db_name, username, password, db_type)
      return ok(result)
    }

    // ── SAVE new connection ───────────────────────────────
    const test = await testConnection(host, port, db_name, username, password, db_type)

    const newConn = await queryOne(
      `INSERT INTO monitored_connections
         (name, host, port, db_name, username, password_encrypted, db_type,
          added_by, status, last_checked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, name, host, port, db_name, username, db_type, status, created_at`,
      [
        name, host, port, db_name, username, encrypt(password), db_type,
        authUser.userId, test.success ? 'active' : 'error',
      ]
    )

    return created({ ...newConn, latencyMs: test.latencyMs, testError: test.error })
  } catch (err) {
    return serverError(err)
  }
}

// PATCH /api/connections?id=xxx — update status (pause/resume)
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_operator')) return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing id')

    const { status } = await req.json()
    if (!['active', 'paused'].includes(status)) return error('Status must be active or paused')

    const updated = await queryOne(
      `UPDATE monitored_connections SET status = $1 WHERE id = $2
       RETURNING id, name, status`,
      [status, id]
    )
    if (!updated) return notFound('Connection')

    return ok(updated)
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/connections?id=xxx — remove a connection
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing id')

    const conn = await queryOne<{ id: string; db_type: 'postgresql' | 'mssql' }>(
      `SELECT id, db_type FROM monitored_connections WHERE id = $1`,
      [id]
    )
    if (!conn) return notFound('Connection')

    await removePool(id, conn.db_type)

    await query(`DELETE FROM monitored_connections WHERE id = $1`, [id])

    return ok({ message: 'Connection removed successfully' })
  } catch (err) {
    return serverError(err)
  }
}
