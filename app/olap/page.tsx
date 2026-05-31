'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection, roleAtLeast } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export default function OLAPPage() {
  const { role } = useConnection()
  const canEtl = roleAtLeast(role, 'db_admin')
  const [summary, setSummary] = useState<any>(null)
  const [heatmap, setHeatmap] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [etlMsg, setEtlMsg] = useState('')
  const [running, setRunning] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [s, h] = await Promise.all([
        apiFetch('/api/olap?type=summary'),
        apiFetch('/api/olap?type=heatmap'),
      ])
      setSummary(s)
      setHeatmap(h || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Warehouse unavailable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function runEtl() {
    setRunning(true)
    setEtlMsg('')
    try {
      const res = await apiFetch('/api/olap?action=etl', { method: 'POST', body: '{}' })
      setEtlMsg(res.message || 'ETL complete')
      await load()
    } catch (err) {
      setEtlMsg(err instanceof Error ? err.message : 'ETL failed')
    } finally {
      setRunning(false)
    }
  }

  // Build a 7×24 intensity grid from heatmap rows
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  let max = 0
  for (const r of heatmap) {
    const d = Number(r.day_of_week), h = Number(r.hour_of_day), c = Number(r.incident_count)
    if (d >= 0 && d < 7 && h >= 0 && h < 24) { grid[d][h] = c; if (c > max) max = c }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">OLAP Incident Analytics</h1>
            <p className="text-slate-400 mt-2">Star-schema warehouse fed by the OLTP → OLAP ETL pipeline.</p>
          </div>
          {canEtl && (
            <button
              onClick={runEtl}
              disabled={running}
              className="bg-[#2f75ff] hover:bg-[#4b8cff] disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              {running ? 'Running ETL…' : 'Run ETL'}
            </button>
          )}
        </div>

        {etlMsg && <div className="p-3 rounded-lg bg-[#2f75ff]/10 border border-[#2f75ff]/30 text-sm text-[#7faaff]">{etlMsg}</div>}

        {error ? (
          <div className="p-6 rounded-[1.5rem] bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-200">
            <p className="font-semibold">Warehouse unavailable</p>
            <p className="mt-1 text-yellow-200/80">{error}</p>
            <p className="mt-2 text-xs text-slate-400">
              Configure MSSQL (MSSQL_* env vars), run <code>db/olap_schema.sql</code>, then click <strong>Run ETL</strong> to load incidents from PostgreSQL.
            </p>
          </div>
        ) : loading ? (
          <div className="text-slate-300">Loading analytics…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card label="Total Incidents" value={summary?.total_incidents ?? 0} />
              <Card label="Resolved" value={summary?.total_resolved ?? 0} tone="text-green-400" />
              <Card label="Fix Success Rate" value={summary?.fix_success_rate != null ? `${summary.fix_success_rate}%` : '—'} tone="text-green-400" />
              <Card label="Avg Resolution" value={summary?.avg_resolution_mins != null ? `${Math.round(summary.avg_resolution_mins)}m` : '—'} />
            </div>

            <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
              <h3 className="text-white font-semibold mb-4">Incidents: Hour vs. Day (CUBE)</h3>
              {max === 0 ? (
                <p className="text-slate-400 text-sm">No incidents in the warehouse yet. Run the ETL after a few scans have logged issues.</p>
              ) : (
                <div className="space-y-1">
                  {DAYS.map((day, d) => (
                    <div key={day} className="flex items-center gap-2">
                      <p className="text-sm text-slate-400 w-12">{day}</p>
                      <div className="flex gap-1 flex-1">
                        {grid[d].map((c, h) => {
                          const intensity = max ? c / max : 0
                          return (
                            <div
                              key={h}
                              title={`${day} ${h}:00 — ${c} incident(s)`}
                              className="flex-1 h-7 rounded-sm"
                              style={{ backgroundColor: c ? `rgba(47,117,255,${0.2 + intensity * 0.8})` : 'rgba(255,255,255,0.04)' }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-3">Darker = more incidents in that hour/day bucket.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Card({ label, value, tone = 'text-white' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
      <p className="text-slate-400 text-xs uppercase">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${tone}`}>{value}</p>
    </div>
  )
}
