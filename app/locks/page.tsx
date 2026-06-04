'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

type SessionRow = {
  pid: number
  usename: string | null
  application_name: string | null
  state: string | null
  wait_event_type: string | null
  wait_event: string | null
  query_start: string | null
  query: string | null
}

type DisplayLock = {
  pid: number
  query_snippet: string
  duration: string
  state: 'blocker' | 'waiting' | 'active' | 'idle'
  blocker_pid?: number
}

function formatDuration(start: string | null): string {
  if (!start) return '—'
  const ms = Date.now() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

export default function LocksPage() {
  const { selectedId, selected } = useConnection()
  const [locks, setLocks] = useState<DisplayLock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedLock, setExpandedLock] = useState<number | null>(null)
  const connName = selected?.name ?? ''

  useEffect(() => {
    let active = true

    async function load() {
      if (!selectedId) { setLocks([]); setLoading(false); return }
      if (selected && selected.db_type !== 'postgresql') {
        setError('Live session monitoring is available for PostgreSQL connections only.')
        setLoading(false)
        return
      }
      try {
        const res = await apiFetch(`/api/monitor?connectionId=${selectedId}&type=locks`)
        const rows: SessionRow[] = res?.data ?? []

        const mapped: DisplayLock[] = rows.map((r) => {
          const waiting = !!(r.wait_event_type || r.wait_event)
          const state: DisplayLock['state'] =
            r.state === 'idle' ? 'idle' : waiting ? 'waiting' : 'active'
          return {
            pid: r.pid,
            query_snippet: r.query || '(no query text)',
            duration: formatDuration(r.query_start),
            state,
          }
        })

        if (active) { setLocks(mapped); setError('') }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load locks')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 5000) // refresh the live view
    return () => { active = false; clearInterval(interval) }
  }, [selectedId, selected])

  const waiters = locks.filter((l) => l.state === 'waiting').length
  const activeCount = locks.filter((l) => l.state === 'active').length

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Concurrency & Locks</h1>
            <p className="text-slate-500 mt-2">
              {connName ? `Live sessions • ${connName}` : 'Live session monitor'}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">{waiters} Waiting</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">{activeCount} Active</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Active Sessions</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{locks.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Waiting</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{waiters}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Active</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-slate-900 font-semibold mb-4">Active Sessions</h3>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading sessions...</p>
          ) : locks.length === 0 ? (
            <p className="text-slate-500 text-sm">No non-idle sessions right now.</p>
          ) : (
            <div className="space-y-3">
              {locks.map((lock, i) => (
                <div
                  key={i}
                  onClick={() => setExpandedLock(expandedLock === i ? null : i)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    lock.state === 'blocker' ? 'border-red-200 bg-red-50' :
                    lock.state === 'waiting' ? 'border-amber-200 bg-amber-50' :
                    lock.state === 'active' ? 'border-blue-200 bg-blue-50' :
                    'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          lock.state === 'blocker' ? 'bg-red-100 text-red-700' :
                          lock.state === 'waiting' ? 'bg-amber-100 text-amber-800' :
                          lock.state === 'active' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {lock.state.toUpperCase()}
                        </span>
                        <span className="text-slate-900 font-semibold">PID {lock.pid}</span>
                        {lock.blocker_pid && (
                          <span className="text-xs text-slate-400">blocked by PID {lock.blocker_pid}</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mt-2 font-mono break-all">{lock.query_snippet}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-slate-900">{lock.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
