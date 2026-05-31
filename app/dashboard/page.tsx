'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '@/lib/api'

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await apiFetch('/api/dashboard')
        setSummary(data.summary)
        setEvents(data.events || [])
      } catch (err) {
        console.error('Dashboard load failed', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="text-white p-6">Loading dashboard...</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Global Fleet Overview</h1>
          <p className="text-slate-400 mt-2">Monitoring {summary?.databaseCount ?? '—'} active databases across {summary?.regionCount ?? '—'} regions</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">Total Databases</p>
            <p className="text-3xl font-bold text-white mt-3">{summary?.databaseCount ?? 0}</p>
            <p className="text-xs text-slate-400 mt-2">Monitored</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">Active Alerts</p>
            <p className="text-3xl font-bold text-red-400 mt-3">{summary?.activeAlerts ?? 0}</p>
            <p className="text-xs text-slate-400 mt-2">Requiring attention</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">Avg Latency</p>
            <p className="text-3xl font-bold text-white mt-3">{summary?.avgLatencyMs ?? 0}ms</p>
            <p className="text-xs text-slate-400 mt-2">Query response</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">System Health</p>
            <p className="text-3xl font-bold text-green-400 mt-3">{summary?.healthScore ?? 0}%</p>
            <p className="text-xs text-slate-400 mt-2">Overall score</p>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Live WebSocket Feed</h2>
            <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 font-semibold">Stream: Connected</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map(event => (
              <div key={event.id} className={`p-3 rounded-lg border-l-4 ${
                event.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                event.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
                'border-blue-500 bg-blue-500/10'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{event.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                    {event.query_snippet && (
                      <p className="text-xs text-slate-500 mt-2 font-mono">{event.query_snippet}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
