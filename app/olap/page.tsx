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
            <h1 className="text-3xl font-bold text-slate-900">OLAP Incident Analytics</h1>
            <p className="text-slate-500 mt-2">
              {summary?.warehouse === 'mssql'
                ? 'Star-schema warehouse (MSSQL) fed by the OLTP → OLAP ETL pipeline.'
                : 'Live incident analytics computed from the OLTP store. Configure MSSQL + Run ETL for the full star-schema warehouse.'}
            </p>
          </div>
          {canEtl && summary?.warehouse === 'mssql' && (
            <button
              onClick={runEtl}
              disabled={running}
              className="bg-[#2f6bff] hover:bg-[#1f54e0] disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-lg transition shadow-sm"
            >
              {running ? 'Running ETL…' : 'Run ETL'}
            </button>
          )}
        </div>

        {etlMsg && <div className="p-3 rounded-xl bg-[#eef3ff] border border-[#cfddff] text-sm text-[#1f54e0]">{etlMsg}</div>}

        {error ? (
          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold">Warehouse unavailable</p>
            <p className="mt-1 text-amber-700">{error}</p>
            <p className="mt-2 text-xs text-slate-500">
              Configure MSSQL (MSSQL_* env vars), run <code>db/olap_schema.sql</code>, then click <strong>Run ETL</strong> to load incidents from PostgreSQL.
            </p>
          </div>
        ) : loading ? (
          <div className="text-slate-500">Loading analytics…</div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card label="Total Incidents" value={summary?.total_incidents ?? 0} />
              <Card label="Resolved" value={summary?.total_resolved ?? 0} tone="text-emerald-600" />
              <Card label="Fix Success Rate" value={summary?.fix_success_rate != null ? `${summary.fix_success_rate}%` : '—'} tone="text-emerald-600" />
              <Card label="Avg Resolution" value={summary?.avg_resolution_mins != null ? `${Math.round(summary.avg_resolution_mins)}m` : '—'} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-900 font-semibold mb-4">Incidents: Hour vs. Day (CUBE)</h3>
              {max === 0 ? (
                <p className="text-slate-500 text-sm">No incidents recorded yet. Let a few live scans run to log issues, then they will appear here.</p>
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
                              style={{ backgroundColor: c ? `rgba(47,107,255,${0.15 + intensity * 0.85})` : '#f1f3f6' }}
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

function Card({ label, value, tone = 'text-slate-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${tone}`}>{value}</p>
    </div>
  )
}
