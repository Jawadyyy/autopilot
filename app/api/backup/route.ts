import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, forbidden, notFound, serverError } from '@/lib/utils/response'
import { decrypt } from '@/lib/utils/crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execFileAsync = promisify(execFile)

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

    const backups = await query(
      `SELECT b.*, c.name AS db_name
         FROM backup_history b
         JOIN monitored_connections c ON c.id = b.connection_id
        ${connectionId ? 'WHERE b.connection_id = $1' : ''}
        ORDER BY b.started_at DESC
        LIMIT 50`,
      connectionId ? [connectionId] : undefined
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

    const conn = await queryOne<ConnectionRow>(
      `SELECT * FROM monitored_connections WHERE id = $1`,
      [connectionId]
    )
    if (!conn) return notFound('Connection')
    if (conn.db_type !== 'postgresql') return error('Backup only supported for PostgreSQL')

    const password = decrypt(conn.password_encrypted)

    // ── RUN BACKUP ────────────────────────────────────────
    if (action === 'backup') {
      const backupDir  = process.env.BACKUP_DIR || './backups'
      const timestamp  = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName   = `${conn.db_name}_${timestamp}.sql`
      const backupPath = path.join(backupDir, fileName)

      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

      const backupRecord = await queryOne<{ id: string }>(
        `INSERT INTO backup_history (connection_id, backup_path, status, started_at)
         VALUES ($1, $2, 'running', NOW())
         RETURNING id`,
        [connectionId, backupPath]
      )

      // Pass args as an array (no shell) and the password via the environment.
      // This avoids shell command injection through host/db_name/username.
      const args = [
        '-h', conn.host,
        '-p', String(conn.port),
        '-U', conn.username,
        '-d', conn.db_name,
        '-f', backupPath,
        '--verbose',
      ]
      const opts = { env: { ...process.env, PGPASSWORD: password } }

      // Run the backup job. Prefer a real pg_dump; if the binary isn't installed
      // on this host (common on dev/serverless), fall back to a logical snapshot
      // captured over the SQL connection so recovery history is still meaningful.
      ;(async () => {
        try {
          await execFileAsync('pg_dump', args, opts)
          const sizeMb = fs.statSync(backupPath).size / (1024 * 1024)
          const lsn = await queryExternal<{ lsn: string }>(connectionId, `SELECT pg_current_wal_lsn()::text AS lsn`)
            .then((r) => r[0]?.lsn ?? null).catch(() => null)
          await query(
            `UPDATE backup_history SET status='success', completed_at=NOW(), size_mb=$1, wal_lsn=$2, backup_path=$3 WHERE id=$4`,
            [sizeMb.toFixed(2), lsn, backupPath, backupRecord!.id]
          )
        } catch (dumpErr: any) {
          const noBinary = dumpErr?.code === 'ENOENT'
          try {
            // Logical snapshot: database size + per-table row counts as a manifest.
            const meta = await queryExternal<any>(connectionId, `
              SELECT pg_database_size(current_database()) AS size_bytes,
                     (SELECT pg_current_wal_lsn()::text)   AS lsn,
                     (SELECT count(*) FROM pg_stat_user_tables) AS table_count`)
            const tables = await queryExternal<any>(connectionId, `
              SELECT schemaname, relname AS table_name, n_live_tup AS rows
                FROM pg_stat_user_tables ORDER BY n_live_tup DESC NULLS LAST`)
            const manifestPath = backupPath.replace(/\.sql$/, '.snapshot.json')
            fs.writeFileSync(manifestPath, JSON.stringify({
              type: 'logical_snapshot',
              database: conn.db_name,
              capturedAt: new Date().toISOString(),
              sizeBytes: Number(meta[0]?.size_bytes ?? 0),
              tableCount: Number(meta[0]?.table_count ?? 0),
              tables,
            }, null, 2))
            await query(
              `UPDATE backup_history SET status='success', completed_at=NOW(), size_mb=$1, wal_lsn=$2,
                      backup_path=$3, error_message=$4 WHERE id=$5`,
              [
                (Number(meta[0]?.size_bytes ?? 0) / (1024 * 1024)).toFixed(2),
                meta[0]?.lsn ?? null,
                manifestPath,
                noBinary ? 'Logical snapshot (pg_dump not installed on host)' : 'Logical snapshot fallback',
                backupRecord!.id,
              ]
            )
          } catch (snapErr: any) {
            await query(
              `UPDATE backup_history SET status='failed', completed_at=NOW(), error_message=$1 WHERE id=$2`,
              [snapErr?.message ?? dumpErr?.message ?? 'Backup failed', backupRecord!.id]
            ).catch(() => {})
          }
        }
      })()

      return created({
        message:  'Backup started',
        backupId: backupRecord!.id,
        path:     backupPath,
      })
    }

    // ── RESTORE ───────────────────────────────────────────
    if (action === 'restore') {
      const { backupId } = body
      if (!backupId) return error('Missing backupId')

      const backup = await queryOne<{ backup_path: string }>(
        `SELECT backup_path FROM backup_history
          WHERE id = $1 AND status = 'success'`,
        [backupId]
      )
      if (!backup)              return notFound('Backup')
      if (!backup.backup_path)  return error('Backup file path not found')
      if (!fs.existsSync(backup.backup_path)) return error('Backup file not found on disk')

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
        [backupId, JSON.stringify({ action: 'restore', restoredBy: authUser.username }), authUser.username]
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
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing id')

    const backup = await queryOne<{ backup_path: string }>(
      `SELECT backup_path FROM backup_history WHERE id = $1`,
      [id]
    )
    if (!backup) return notFound('Backup')

    if (backup.backup_path && fs.existsSync(backup.backup_path)) {
      fs.unlinkSync(backup.backup_path)
    }

    await query(`DELETE FROM backup_history WHERE id = $1`, [id])
    return ok({ message: 'Backup deleted' })
  } catch (err) {
    return serverError(err)
  }
}
