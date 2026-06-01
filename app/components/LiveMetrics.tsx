'use client'

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Metrics = {
  active_connections: number | null
  idle_connections:   number | null
  cache_hit_ratio:    number | null
  avg_query_ms:       number | null
  slow_query_count:   number | null
}

const POLL_MS = 5000

function fmt(v: number | string | null | undefined, suffix = ''): string {
  if (v === null || v === undefined) return '—'
  return `${v}${suffix}`
}

export default function LiveMetrics({
  connectionId,
  dbType,
  name,
}: {
  connectionId: string
  dbType: 'postgresql' | 'mssql'
  name: string
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [live, setLive] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const res = await apiFetch(`/api/monitor?connectionId=${connectionId}&type=metrics`)
        if (!active) return
        setMetrics(res?.data ?? null)
        setUpdatedAt(new Date())
        setError('')
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      }
    }

    if (dbType !== 'postgresql') return

    poll() // immediate first read
    if (live) {
      timer.current = setInterval(poll, POLL_MS)
    }
    return () => {
      active = false
      if (timer.current) clearInterval(timer.current)
    }
  }, [connectionId, dbType, live])

  if (dbType !== 'postgresql') {
    return (
      <div className="mt-3 p-4 rounded-lg bg-black/20 border border-white/10 text-sm text-slate-400">
        Live metrics are currently available for PostgreSQL connections only.
      </div>
    )
  }

  const cacheRatio = metrics?.cache_hit_ratio != null ? Number(metrics.cache_hit_ratio) : null
  const avgQuery   = metrics?.avg_query_ms != null ? Number(metrics.avg_query_ms) : null
  const slowCount  = metrics?.slow_query_count != null ? Number(metrics.slow_query_count) : null

  const cards: { label: string; value: string; tone?: string }[] = [
    { label: 'Active Sessions', value: fmt(metrics?.active_connections) },
    { label: 'Idle Sessions',   value: fmt(metrics?.idle_connections) },
    {
      label: 'Cache Hit Ratio',
      value: cacheRatio != null ? `${cacheRatio.toFixed(2)}%` : '—',
      tone: cacheRatio != null && cacheRatio >= 95 ? 'text-green-400' : 'text-yellow-300',
    },
    { label: 'Avg Query', value: avgQuery != null ? `${avgQuery.toFixed(1)}ms` : '—' },
    {
      label: 'Slow Queries',
      value: fmt(slowCount),
      tone: slowCount != null && slowCount > 0 ? 'text-red-400' : 'text-green-400',
    },
  ]

  return (
    <div className="mt-3 p-4 rounded-lg bg-black/20 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-sm font-semibold text-white">Live metrics · {name}</span>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-slate-500">Updated {updatedAt.toLocaleTimeString()}</span>
          )}
          <button
            onClick={() => setLive((v) => !v)}
            className="text-xs text-[#2f75ff] hover:text-[#4b8cff]"
          >
            {live ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400">
          {error}
          <span className="block text-xs text-slate-500 mt-1">
            Tip: live query stats need the <code>pg_stat_statements</code> extension enabled on the target database.
          </span>
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-[#0c1628] border border-white/10 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{c.label}</p>
              <p className={`text-xl font-bold mt-1 ${c.tone ?? 'text-white'}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
