'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import IssuesList from '../components/IssuesList'
import { useConnection, roleAtLeast } from '../components/ConnectionContext'
import { healthTone } from '../components/useScan'
import { useEventStream, describeEvent } from '../components/useEventStream'
import { apiFetch } from '@/lib/api'

type Cluster = { id: string; name: string; status: string; db_type: string; last_checked_at: string | null }

function Gauge({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#eef0f3" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="70" y="64" textAnchor="middle" className="rotate-90" transform="rotate(90 70 70)" fill="#0f172a" fontSize="30" fontWeight="700">{score}</text>
      <text x="70" y="86" textAnchor="middle" transform="rotate(90 70 70)" fill="#94a3b8" fontSize="11">/ 100</text>
    </svg>
  )
}

function StatCard({ label, value, tone = 'text-slate-900', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <p className="text-xs uppercase tracking-wider font-medium text-slate-400">{label}</p>
      <p className={`text-3xl font-bold mt-3 ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { connections, selected, selectedId, setSelectedId, scan, scanLoading: scanning, role, applyFix } = useConnection()
  const canApply = roleAtLeast(role, 'db_operator')
  const { events: liveEvents, connected: streamConnected } = useEventStream()
  const [summary, setSummary] = useState<any>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/api/dashboard')
        setSummary(data.summary)
        setClusters(data.clusters || [])
        setEvents(data.events || [])
      } catch (err) {
        console.error('Dashboard load failed', err)
      }
    }
    load()
  }, [])

  const issues = scan?.issues ?? []
  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  }
  const score = scan?.healthScore ?? null
  const cache = scan?.metrics.cache_hit_ratio
  const maxBar = Math.max(1, counts.critical, counts.high, counts.warning, counts.info)

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Global Fleet Overview</h1>
          <p className="text-slate-500 mt-2">
            Monitoring {summary?.databaseCount ?? connections.length} database{(summary?.databaseCount ?? connections.length) === 1 ? '' : 's'}
            {selected ? ` · live view: ${selected.name}` : ''}
          </p>
        </div>

        {/* Real-time event stream */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs uppercase tracking-wider font-medium text-slate-400">Real-time event stream</span>
            <span className="text-xs text-slate-400">{streamConnected ? 'connected' : 'connecting…'}</span>
          </div>
          {liveEvents.length === 0 ? (
            <p className="text-xs text-slate-400">Listening for autopilot fixes and alerts…</p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {liveEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    ev.type === 'autofix' ? 'bg-[#eef3ff] text-[#1f54e0]' :
                    ev.type === 'fix_applied' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>{ev.type}</span>
                  <span className="text-slate-600">{describeEvent(ev)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Databases" value={String(summary?.databaseCount ?? connections.length)} sub="Monitored" />
          <StatCard label="Live Alerts" value={String(issues.length)} tone={issues.length ? 'text-red-600' : 'text-emerald-600'} sub={selected ? `on ${selected.name}` : '—'} />
          <StatCard label="Active Sessions" value={scan?.metrics.active_connections != null ? String(scan.metrics.active_connections) : '—'} sub="Right now" />
          <StatCard label="Cache Hit Ratio" value={cache != null ? `${Number(cache).toFixed(1)}%` : '—'} tone={cache != null && Number(cache) >= 95 ? 'text-emerald-600' : 'text-amber-600'} sub="Buffer cache" />
        </div>

        {/* Health + severity breakdown */}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
            <p className="text-xs uppercase tracking-wider font-medium text-slate-400 mb-3">Health Score</p>
            {score != null ? <Gauge score={score} /> : (
              <div className="h-[140px] flex items-center text-slate-400 text-sm">
                {scanning ? 'Scanning…' : '—'}
              </div>
            )}
            {score != null && <p className={`mt-3 font-semibold ${healthTone(score)}`}>{score >= 80 ? 'Healthy' : score >= 50 ? 'Degraded' : 'At Risk'}</p>}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Issue Breakdown {selected ? `· ${selected.name}` : ''}</h2>
            {(['critical', 'high', 'warning', 'info'] as const).map((sev) => {
              const map = { critical: 'bg-red-500', high: 'bg-orange-500', warning: 'bg-amber-400', info: 'bg-blue-500' }
              return (
                <div key={sev} className="flex items-center gap-3 mb-3">
                  <span className="w-20 text-xs uppercase text-slate-500">{sev}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-3 ${map[sev]} rounded-full transition-all`} style={{ width: `${(counts[sev] / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm text-slate-900 font-semibold">{counts[sev]}</span>
                </div>
              )
            })}
            {issues.length === 0 && !scanning && (
              <p className="text-emerald-600 text-sm mt-2">No active issues on this database.</p>
            )}
          </div>
        </div>

        {/* Connected databases */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Connected Databases</h2>
          {clusters.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-sm">
              No databases connected yet. Add one from the Connections page.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clusters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`text-left bg-white border rounded-2xl p-5 shadow-sm transition ${
                    selectedId === c.id ? 'border-[#2f6bff] ring-2 ring-[#2f6bff]/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900 font-semibold">{c.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${c.status === 'healthy' || c.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{c.db_type === 'postgresql' ? 'PostgreSQL' : 'MSSQL'}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {c.last_checked_at ? `Checked ${new Date(c.last_checked_at).toLocaleTimeString()}` : 'Not checked yet'}
                  </p>
                  {selectedId === c.id && <p className="text-xs text-[#2f6bff] mt-2 font-semibold">● Live view</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live alerts with remediation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Live Alerts & Remediation</h2>
            {scan && <span className="text-xs text-slate-400">Updated {new Date(scan.scannedAt).toLocaleTimeString()}</span>}
          </div>
          {!selectedId ? (
            <p className="text-slate-500 text-sm">Select a database to run a live scan.</p>
          ) : scanning && !scan ? (
            <p className="text-slate-500 text-sm">Scanning {selected?.name}…</p>
          ) : (
            <IssuesList issues={issues} canApply={canApply} onApply={applyFix} />
          )}
        </div>

        {/* Recent persisted events */}
        {events.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Logged Events</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className={`p-3 rounded-lg border-l-4 ${
                  event.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  event.severity === 'warning' ? 'border-amber-400 bg-amber-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
