import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, forbidden, notFound, serverError } from '@/lib/utils/response'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

// GET /api/backup?connectionId=xxx
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const connectionId = req.nextUrl.searchParams.get('connectionId')

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) return serverError('Database not available')

    const queryBuilder = supabaseAdmin
      .from('backup_history')
      .select('*, monitored_connections!inner(name)')
      .order('started_at', { ascending: false })
      .limit(50)

    if (connectionId) {
      queryBuilder.eq('connection_id', connectionId)
    }

    const { data: backups, error: fetchError } = await queryBuilder
    if (fetchError) throw fetchError

    const formatted = backups.map((item: any) => ({
      ...item,
      db_name: item.monitored_connections?.name,
    }))

    return ok(formatted)
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/backup?action=backup|restore
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const action = req.nextUrl.searchParams.get('action') || 'backup'
    const body   = await req.json()
    const { connectionId } = body

    if (!connectionId) return error('Missing connectionId')

    // Get connection details
    const { data: conn, error: connError } = await supabaseAdmin
      .from('monitored_connections')
      .select('*')
      .eq('id', connectionId)
      .single()
    if (connError) throw connError
    if (!conn) return notFound('Connection')
    if (conn.db_type !== 'postgresql') return error('Backup only supported for PostgreSQL')

    // ── RUN BACKUP ────────────────────────────────────────
    if (action === 'backup') {
      const backupDir  = process.env.BACKUP_DIR || './backups'
      const timestamp  = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName   = `${conn.db_name}_${timestamp}.sql`
      const backupPath = path.join(backupDir, fileName)

      // Create backup dir if not exists
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

      // Create backup record as running
      const { data: backupRecord, error: insertError } = await supabaseAdmin
        .from('backup_history')
        .insert({ connection_id: connectionId, backup_path: backupPath, status: 'running' })
        .select('*')
        .single()
      if (insertError) throw insertError

      // Run pg_dump asynchronously
      const pgDumpCmd = [
        `PGPASSWORD="${conn.password_encrypted}"`,
        `pg_dump`,
        `-h ${conn.host}`,
        `-p ${conn.port}`,
        `-U ${conn.username}`,
        `-d ${conn.db_name}`,
        `-f "${backupPath}"`,
        `--verbose`,
      ].join(' ')

      // Fire and forget — update status when done
      execAsync(pgDumpCmd)
        .then(async () => {
          const stats   = fs.statSync(backupPath)
          const sizeMb  = stats.size / (1024 * 1024)

          // Get WAL LSN for point-in-time restore reference
          const lsnResult = await queryOne<any>(
            `SELECT pg_current_wal_lsn()::text AS lsn`
          ).catch(() => null)

          const { error: updateError } = await supabaseAdmin
            .from('backup_history')
            .update({
              status: 'success',
              completed_at: new Date().toISOString(),
              size_mb: sizeMb.toFixed(2),
              wal_lsn: lsnResult?.lsn ?? null,
            })
            .eq('id', backupRecord.id)

          if (updateError) throw updateError
        })
        .catch(async (err) => {
          await query(
            `UPDATE backup_history
             SET status = 'failed', completed_at = NOW(), error_message = $1
             WHERE id = $2`,
            [err.message, backupRecord.id]
          )
        })

      return created({
        message:  'Backup started',
        backupId: backupRecord.id,
        path:     backupPath,
      })
    }

    // ── RESTORE ───────────────────────────────────────────
    if (action === 'restore') {
      const { backupId } = body
      if (!backupId) return error('Missing backupId')

      const { data: backup, error: backupFetchError } = await supabaseAdmin
        .from('backup_history')
        .select('*')
        .eq('id', backupId)
        .eq('status', 'success')
        .single()
      if (backupFetchError) throw backupFetchError
      if (!backup)            return notFound('Backup')
      if (!backup.backup_path) return error('Backup file path not found')
      if (!fs.existsSync(backup.backup_path)) return error('Backup file not found on disk')

      const restoreCmd = [
        `PGPASSWORD="${conn.password_encrypted}"`,
        `psql`,
        `-h ${conn.host}`,
        `-p ${conn.port}`,
        `-U ${conn.username}`,
        `-d ${conn.db_name}`,
        `-f "${backup.backup_path}"`,
      ].join(' ')

      // Log restore action
      await query(
        `INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
         VALUES ('backup_history', 'UPDATE', $1, $2, $3)`,
        [backupId, JSON.stringify({ action: 'restore', restoredBy: authUser.username }), authUser.username]
      )

      execAsync(restoreCmd)
        .then(() => console.log(`Restore of backup ${backupId} completed`))
        .catch((err) => console.error(`Restore failed:`, err.message))

      return ok({ message: 'Restore started. Check server logs for progress.' })
    }

    return error('Invalid action. Use backup or restore')
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/backup?id=xxx — delete a backup record
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing id')

    const { data: backup, error: backupFetchError } = await supabaseAdmin
      .from('backup_history')
      .select('*')
      .eq('id', id)
      .single()
    if (backupFetchError) throw backupFetchError
    if (!backup) return notFound('Backup')

    if (backup.backup_path && fs.existsSync(backup.backup_path)) {
      fs.unlinkSync(backup.backup_path)
    }

    const { error: deleteError } = await supabaseAdmin
      .from('backup_history')
      .delete()
      .eq('id', id)
    if (deleteError) throw deleteError
    return ok({ message: 'Backup deleted' })
  } catch (err) {
    return serverError(err)
  }
}