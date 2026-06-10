import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getAuthUser, requireConnection, ownedConnectionIds } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, notFound, serverError } from '@/lib/utils/response'
import { decrypt } from '@/lib/utils/crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execFileAsync = promisify(execFile)

// On Vercel (and other serverless hosts) there's no pg_dump/psql binary and the
// filesystem is read-only outside /tmp, so we skip physical dumps there.
const HOSTED = !!process.env.VERCEL

interface ConnectionRow {
  id:                 string
  name:               string
  host:               string
  port:               number
  db_name:            string
  username:           string
  password_encrypted: string
  db_type:            'postgresql' | 'mssql'
}

// GET /api/backup?connectionId=xxx
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const connectionId = req.nextUrl.searchParams.get('connectionId')

    // Scope to the caller's own connections.
    let where = ''
    let params: any[] | undefined
    if (connectionId) {
      if (!(await requireConnection(authUser, connectionId, 'id'))) return notFound('Connection')
      where = 'WHERE b.connection_id = $1'
      params = [connectionId]
    } else {
      const ids = await ownedConnectionIds(authUser)
      if (ids !== null) { where = 'WHERE b.connection_id = ANY($1)'; params = [ids] }
    }

    const backups = await query(
      `SELECT b.*, c.name AS db_name
         FROM backup_history b
         JOIN monitored_connections c ON c.id = b.connection_id
        ${where}
        ORDER BY b.started_at DESC
        LIMIT 50`,
      params
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

    const action = req.nextUrl.searchParams.get('action') || 'backup'
    const body   = await req.json()
    const { connectionId } = body

    if (!connectionId) return error('Missing connectionId')

    const conn = await requireConnection<ConnectionRow>(authUser, connectionId, '*')
    if (!conn) return notFound('Connection')
    if (conn.db_type !== 'postgresql') return error('Backup only supported for PostgreSQL')

    const password = decrypt(conn.password_encrypted)

    // ── RUN BACKUP ────────────────────────────────────────
    if (action === 'backup') {
      const backupRecord = await queryOne<{ id: string }>(
        `INSERT INTO backup_history (connection_id, status, started_at)
         VALUES ($1, 'running', NOW())
         RETURNING id`,
        [connectionId]
      )

      // Always capture a logical snapshot over the SQL connection (no filesystem
      // needed → works on Vercel). On a self-hosted box we additionally attempt a
      // physical pg_dump to disk when the binary + a writable dir are available.
      ;(async () => {
        try {
          const meta = await queryExternal<any>(connectionId, `
            SELECT pg_database_size(current_database()) AS size_bytes,
                   (SELECT pg_current_wal_lsn()::text)   AS lsn,
                   (SELECT count(*) FROM pg_stat_user_tables) AS table_count`)
          const tables = await queryExternal<any>(connectionId, `
            SELECT schemaname, relname AS table_name, n_live_tup AS rows
              FROM pg_stat_user_tables ORDER BY n_live_tup DESC NULLS LAST`)

          const snapshot = {
            type: 'logical_snapshot',
            database: conn.db_name,
            capturedAt: new Date().toISOString(),
            sizeBytes: Number(meta[0]?.size_bytes ?? 0),
            tableCount: Number(meta[0]?.table_count ?? 0),
            tables,
          }
          const sizeMb = (Number(meta[0]?.size_bytes ?? 0) / (1024 * 1024)).toFixed(2)
          const lsn = meta[0]?.lsn ?? null

          let backupPath: string | null = null
          let note = 'Logical snapshot (metadata, hosted-safe)'

          // Physical dump only off-serverless (Vercel has no pg_dump and a
          // read-only filesystem outside /tmp).
          if (!HOSTED) {
            try {
              const backupDir = process.env.BACKUP_DIR || './backups'
              if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
              const fileName = `${conn.db_name}_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
              const p = path.join(backupDir, fileName)
              await execFileAsync('pg_dump', [
                '-h', conn.host, '-p', String(conn.port), '-U', conn.username,
                '-d', conn.db_name, '-f', p, '--verbose',
              ], { env: { ...process.env, PGPASSWORD: password } })
              backupPath = p
              note = 'Physical pg_dump'
            } catch { /* keep logical snapshot only */ }
          }

          await query(
            `UPDATE backup_history
                SET status='success', completed_at=NOW(), size_mb=$1, wal_lsn=$2,
                    backup_path=$3, snapshot=$4::jsonb, error_message=$5
              WHERE id=$6`,
            [sizeMb, lsn, backupPath, JSON.stringify(snapshot), note, backupRecord!.id]
          )
        } catch (err: any) {
          await query(
            `UPDATE backup_history SET status='failed', completed_at=NOW(), error_message=$1 WHERE id=$2`,
            [err?.message ?? 'Backup failed', backupRecord!.id]
          ).catch(() => {})
        }
      })()

      return created({ message: 'Backup started', backupId: backupRecord!.id })
    }

    // ── RESTORE ───────────────────────────────────────────
    if (action === 'restore') {
      const { backupId } = body
      if (!backupId) return error('Missing backupId')

      const backup = await queryOne<{ backup_path: string; connection_id: string }>(
        `SELECT backup_path, connection_id FROM backup_history
          WHERE id = $1 AND status = 'success'`,
        [backupId]
      )
      if (!backup)              return notFound('Backup')
      // The backup must belong to the connection being restored (which the
      // caller already owns) — never restore another user's snapshot.
      if (backup.connection_id !== connectionId) return notFound('Backup')

      // Physical restore needs a pg_dump file on disk + the psql binary, which
      // only exist in self-hosted deployments. Hosted (Vercel) backups are
      // metadata-only logical snapshots, so there's nothing to restore from.
      if (HOSTED || !backup.backup_path || !fs.existsSync(backup.backup_path)) {
        return error('Physical restore is only available in self-hosted mode. Hosted backups are metadata-only logical snapshots.', 400)
      }

      const args = [
        '-h', conn.host,
        '-p', String(conn.port),
        '-U', conn.username,
        '-d', conn.db_name,
        '-f', backup.backup_path,
      ]
      const opts = { env: { ...process.env, PGPASSWORD: password } }

      // Log restore action to the audit trail.
      await query(
        `INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
         VALUES ('backup_history', 'UPDATE', $1, $2, $3)`,
        [backupId, JSON.stringify({ action: 'restore', restoredBy: authUser.email }), authUser.email]
      )

      execFileAsync('psql', args, opts)
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

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing id')

    const backup = await queryOne<{ backup_path: string; connection_id: string }>(
      `SELECT backup_path, connection_id FROM backup_history WHERE id = $1`,
      [id]
    )
    if (!backup) return notFound('Backup')
    // Only the owner of the backup's connection (or an admin) may delete it.
    if (!(await requireConnection(authUser, backup.connection_id, 'id'))) return notFound('Backup')

    if (backup.backup_path && fs.existsSync(backup.backup_path)) {
      fs.unlinkSync(backup.backup_path)
    }

    await query(`DELETE FROM backup_history WHERE id = $1`, [id])
    return ok({ message: 'Backup deleted' })
  } catch (err) {
    return serverError(err)
  }
}
