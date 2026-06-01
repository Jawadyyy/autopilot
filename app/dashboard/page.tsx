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
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="70" y="64" textAnchor="middle" className="rotate-90" transform="rotate(90 70 70)" fill="white" fontSize="30" fontWeight="700">{score}</text>
      <text x="70" y="86" textAnchor="middle" transform="rotate(90 70 70)" fill="#94a3b8" fontSize="11">/ 100</text>
    </svg>
  )
}

function StatCard({ label, value, tone = 'text-white', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
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
          <h1 className="text-3xl font-bold text-white">Global Fleet Overview</h1>
          <p className="text-slate-400 mt-2">
            Monitoring {summary?.databaseCount ?? connections.length} database{(summary?.databaseCount ?? connections.length) === 1 ? '' : 's'}
            {selected ? ` · live view: ${selected.name}` : ''}
          </p>
        </div>

        {/* Real-time event stream */}
        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs uppercase tracking-widest text-slate-400">Real-time event stream</span>
            <span className="text-xs text-slate-500">{streamConnected ? 'connected' : 'connecting…'}</span>
          </div>
          {liveEvents.length === 0 ? (
            <p className="text-xs text-slate-500">Listening for autopilot fixes and alerts…</p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {liveEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-mono">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    ev.type === 'autofix' ? 'bg-[#2f75ff]/20 text-[#7faaff]' :
                    ev.type === 'fix_applied' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>{ev.type}</span>
                  <span className="text-slate-300">{describeEvent(ev)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Databases" value={String(summary?.databaseCount ?? connections.length)} sub="Monitored" />
          <StatCard label="Live Alerts" value={String(issues.length)} tone={issues.length ? 'text-red-400' : 'text-green-400'} sub={selected ? `on ${selected.name}` : '—'} />
          <StatCard label="Active Sessions" value={scan?.metrics.active_connections != null ? String(scan.metrics.active_connections) : '—'} sub="Right now" />
          <StatCard label="Cache Hit Ratio" value={cache != null ? `${Number(cache).toFixed(1)}%` : '—'} tone={cache != null && Number(cache) >= 95 ? 'text-green-400' : 'text-yellow-300'} sub="Buffer cache" />
        </div>

        {/* Health + severity breakdown */}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6 flex flex-col items-center justify-center">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Health Score</p>
            {score != null ? <Gauge score={score} /> : (
              <div className="h-[140px] flex items-center text-slate-500 text-sm">
                {scanning ? 'Scanning…' : '—'}
              </div>
            )}
            {score != null && <p className={`mt-3 font-semibold ${healthTone(score)}`}>{score >= 80 ? 'Healthy' : score >= 50 ? 'Degraded' : 'At Risk'}</p>}
          </div>

          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Issue Breakdown {selected ? `· ${selected.name}` : ''}</h2>
            {(['critical', 'high', 'warning', 'info'] as const).map((sev) => {
              const map = { critical: 'bg-red-500', high: 'bg-orange-500', warning: 'bg-yellow-500', info: 'bg-blue-500' }
              return (
                <div key={sev} className="flex items-center gap-3 mb-3">
                  <span className="w-20 text-xs uppercase text-slate-400">{sev}</span>
                  <div className="flex-1 bg-[#0a0f1a] rounded-full h-3 overflow-hidden">
                    <div className={`h-3 ${map[sev]} rounded-full transition-all`} style={{ width: `${(counts[sev] / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-sm text-white font-semibold">{counts[sev]}</span>
                </div>
              )
            })}
            {issues.length === 0 && !scanning && (
              <p className="text-green-400 text-sm mt-2">No active issues on this database.</p>
            )}
          </div>
        </div>

        {/* Connected databases */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Connected Databases</h2>
          {clusters.length === 0 ? (
            <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-8 text-center text-slate-400 text-sm">
              No databases connected yet. Add one from the Connections page.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clusters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`text-left bg-[#0c1628] border rounded-[1.5rem] p-5 transition ${
                    selectedId === c.id ? 'border-[#2f75ff]/60 ring-1 ring-[#2f75ff]/40' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{c.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${c.status === 'healthy' || c.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{c.db_type === 'postgresql' ? 'PostgreSQL' : 'MSSQL'}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {c.last_checked_at ? `Checked ${new Date(c.last_checked_at).toLocaleTimeString()}` : 'Not checked yet'}
                  </p>
                  {selectedId === c.id && <p className="text-xs text-[#7faaff] mt-2 font-semibold">● Live view</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live alerts with remediation */}
        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Live Alerts & Remediation</h2>
            {scan && <span className="text-xs text-slate-500">Updated {new Date(scan.scannedAt).toLocaleTimeString()}</span>}
          </div>
          {!selectedId ? (
            <p className="text-slate-400 text-sm">Select a database to run a live scan.</p>
          ) : scanning && !scan ? (
            <p className="text-slate-400 text-sm">Scanning {selected?.name}…</p>
          ) : (
            <IssuesList issues={issues} canApply={canApply} onApply={applyFix} />
          )}
        </div>

        {/* Recent persisted events */}
        {events.length > 0 && (
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Logged Events</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className={`p-3 rounded-lg border-l-4 ${
                  event.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                  event.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
                  'border-blue-500 bg-blue-500/10'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white text-sm">{event.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{event.description}</p>
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
