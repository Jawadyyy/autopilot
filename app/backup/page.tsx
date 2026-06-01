'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

type BackupRow = {
  id: string
  db_name: string
  backup_path: string | null
  status: string
  started_at: string | null
  completed_at: string | null
  size_mb: number | string | null
  wal_lsn: string | null
  error_message: string | null
}

function duration(start: string | null, end: string | null): string {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function BackupPage() {
  const { selectedId, selected } = useConnection()
  const [backups, setBackups] = useState<BackupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const canBackup = !!selected && selected.db_type === 'postgresql'

  async function loadBackups() {
    // History is filtered to the selected connection when one is chosen.
    const data = await apiFetch(selectedId ? `/api/backup?connectionId=${selectedId}` : '/api/backup')
    setBackups(data || [])
  }

  useEffect(() => {
    let active = true
    async function init() {
      setLoading(true)
      try {
        await loadBackups()
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load backups')
      } finally {
        if (active) setLoading(false)
      }
    }
    init()
    return () => { active = false }
  }, [selectedId])

  async function runBackup() {
    if (!canBackup) { setError('Select a PostgreSQL connection to back up.'); return }
    setRunning(true)
    setError('')
    try {
      await apiFetch('/api/backup?action=backup', {
        method: 'POST',
        body: JSON.stringify({ connectionId: selectedId }),
      })
      // The dump runs asynchronously server-side; poll the history a couple times.
      await loadBackups()
      setTimeout(loadBackups, 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed to start')
    } finally {
      setRunning(false)
    }
  }

  const statusClass = (status: string) =>
    status === 'success' ? 'bg-green-500/20 text-green-300' :
    status === 'running' ? 'bg-blue-500/20 text-blue-300' :
    status === 'failed'  ? 'bg-red-500/20 text-red-300' :
    'bg-slate-500/20 text-slate-300'

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Backup & Recovery Console</h1>
            <p className="text-slate-400 mt-2">
              {canBackup ? `pg_dump / WAL recovery • ${selected!.name}` : 'Select a PostgreSQL database from the top bar to back it up.'}
            </p>
          </div>
          <button
            onClick={runBackup}
            disabled={running || !canBackup}
            className="bg-[#2f75ff] hover:bg-[#4b8cff] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            {running ? 'Starting...' : 'Run Backup Now'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
        )}

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Backup History</h3>
          {loading ? (
            <p className="text-slate-400 text-sm">Loading backups...</p>
          ) : backups.length === 0 ? (
            <p className="text-slate-400 text-sm">No backups yet. Run one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">STARTED (UTC)</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">DATABASE</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">SIZE</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">DURATION</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">STATUS</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">WAL LSN</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="py-3 px-4 text-white text-xs">
                        {b.started_at ? new Date(b.started_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">{b.db_name}</td>
                      <td className="py-3 px-4 text-slate-300">{b.size_mb != null ? `${b.size_mb} MB` : '—'}</td>
                      <td className="py-3 px-4 text-slate-300">{duration(b.started_at, b.completed_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs font-mono">{b.wal_lsn || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
