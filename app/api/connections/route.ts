import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
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

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) return serverError('Database not available')

    const { data, error: fetchError } = await supabaseAdmin
      .from('monitored_connections')
      .select('id,name,host,port,db_name,username,db_type,status,last_checked_at,last_error,created_at')
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError
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

    // ── TEST only (don't save) ────────────────────────────
    if (action === 'test') {
      const parsed = ConnectionSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { host, port, db_name, username, password, db_type } = parsed.data
      const result = await testConnection(host, port, db_name, username, password, db_type)
      return ok(result)
    }

    // ── SAVE new connection ───────────────────────────────
    const parsed = ConnectionSchema.safeParse(body)
    if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

    const { name, host, port, db_name, username, password, db_type } = parsed.data

    // Test before saving
    const test = await testConnection(host, port, db_name, username, password, db_type)

    const { data: newConn, error: insertError } = await supabaseAdmin
      .from('monitored_connections')
      .insert({
        name,
        host,
        port,
        db_name,
        username,
        password_encrypted: encrypt(password),
        db_type,
        added_by: authUser.userId,
        status: test.success ? 'active' : 'error',
        last_checked_at: new Date().toISOString(),
      })
      .select('id,name,host,port,db_name,username,db_type,status,created_at')
      .single()

    if (insertError) throw insertError
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

    const id     = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing id')

    const { status } = await req.json()
    if (!['active', 'paused'].includes(status)) return error('Status must be active or paused')

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('monitored_connections')
      .update({ status })
      .eq('id', id)
      .select('id,name,status')
      .single()

    if (updateError) throw updateError
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

    const { data: conn, error: fetchError } = await supabaseAdmin
      .from('monitored_connections')
      .select('id,db_type')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!conn) return notFound('Connection')

    await removePool(id, conn.db_type)

    const { error: deleteError } = await supabaseAdmin
      .from('monitored_connections')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return ok({ message: 'Connection removed successfully' })
  } catch (err) {
    return serverError(err)
  }
}