import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
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

    const backups = await query<any>(
      `SELECT
         bh.*,
         mc.name AS db_name
       FROM backup_history bh
       JOIN monitored_connections mc ON mc.id = bh.connection_id
       WHERE ($1::uuid IS NULL OR bh.connection_id = $1::uuid)
       ORDER BY bh.started_at DESC
       LIMIT 50`,
      [connectionId ?? null]
    )

    return ok(backups)
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
    const conn = await queryOne<any>(
      `SELECT * FROM monitored_connections WHERE id = $1`, [connectionId]
    )
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
      const backupRecord = await queryOne<any>(
        `INSERT INTO backup_history (connection_id, backup_path, status)
         VALUES ($1, $2, 'running')
         RETURNING *`,
        [connectionId, backupPath]
      )

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

          await query(
            `UPDATE backup_history
             SET status = 'success', completed_at = NOW(),
                 size_mb = $1, wal_lsn = $2
             WHERE id = $3`,
            [sizeMb.toFixed(2), lsnResult?.lsn ?? null, backupRecord.id]
          )
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

      const backup = await queryOne<any>(
        `SELECT * FROM backup_history WHERE id = $1 AND status = 'success'`,
        [backupId]
      )
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

    const backup = await queryOne<any>(
      'SELECT * FROM backup_history WHERE id = $1', [id]
    )
    if (!backup) return notFound('Backup')

    // Delete file from disk if exists
    if (backup.backup_path && fs.existsSync(backup.backup_path)) {
      fs.unlinkSync(backup.backup_path)
    }

    await query('DELETE FROM backup_history WHERE id = $1', [id])
    return ok({ message: 'Backup deleted' })
  } catch (err) {
    return serverError(err)
  }
}