'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

interface ConnectionCard {
  id: string
  name: string
  host: string
  port: number
  db_name: string
  db_type: string
  status: string
  last_checked_at: string | null
  last_error: string | null
}

const sampleConnections: ConnectionCard[] = [
  {
    id: '1',
    name: 'Orders DB',
    host: 'orders-prod.db.local',
    port: 5432,
    db_name: 'orders',
    db_type: 'postgresql',
    status: 'active',
    last_checked_at: '2m ago',
    last_error: null,
  },
  {
    id: '2',
    name: 'Inventory MS',
    host: 'inventory-sql.prod',
    port: 1433,
    db_name: 'inventory',
    db_type: 'mssql',
    status: 'paused',
    last_checked_at: '5m ago',
    last_error: 'Sync paused for maintenance',
  },
  {
    id: '3',
    name: 'Analytics',
    host: 'analytics.db.internal',
    port: 5432,
    db_name: 'analytics',
    db_type: 'postgresql',
    status: 'active',
    last_checked_at: '1m ago',
    last_error: null,
  },
]

export default function DashboardPage() {
  const [connections, setConnections] = useState<ConnectionCard[]>(sampleConnections)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = window.localStorage.getItem('db-autopilot-token')
    if (!token) {
      setError('Please log in to view the dashboard.')
      setLoading(false)
      return
    }

    fetch('/api/connections', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body?.message || 'Failed to load connections')
        }
        return res.json()
      })
      .then((result) => {
        setConnections(result.data ?? result)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell>
      <PageHeader
        title="Global Dashboard"
        description="Live observability across external PostgreSQL and MSSQL sources, with automated issue detection and performance signals in one place."
        tag="Health Overview"
      />

      {loading ? (
        <div className="rounded-[2rem] border border-white/10 bg-[#081a31]/95 p-10 text-center text-sm text-slate-400">
          Loading monitored connections…
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-[#ff5e5e]/20 bg-[#2c1318]/95 p-10 text-sm text-[#ff9a9a]">
          {error}
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Monitored sources</p>
              <p className="mt-4 text-4xl font-semibold text-white">{connections.length}</p>
              <p className="mt-3 text-sm text-slate-400">Active database targets</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Realtime events</p>
              <p className="mt-4 text-4xl font-semibold text-[#7faaff]">72</p>
              <p className="mt-3 text-sm text-slate-400">Events in the last hour</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Avg latency</p>
              <p className="mt-4 text-4xl font-semibold text-white">320ms</p>
              <p className="mt-3 text-sm text-slate-400">Rolling 30-minute average</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_24px_50px_rgba(0,0,0,0.24)]">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Health score</p>
              <p className="mt-4 text-4xl font-semibold text-[#2f75ff]">84</p>
              <p className="mt-3 text-sm text-slate-400">Overall system rating</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
            <section className="rounded-[2rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Database status</p>
                  <h2 className="mt-3 text-xl font-semibold text-white">Connection health</h2>
                </div>
                <span className="rounded-full bg-[#2f75ff]/15 px-3 py-1 text-xs font-semibold uppercase text-[#8ab9ff]">
                  Live sync
                </span>
              </div>

              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#071a30]/95">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#091c33]/95 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Source</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Last checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((connection) => (
                      <tr key={connection.id} className="border-t border-white/10">
                        <td className="px-5 py-4">
                          <div className="text-white">{connection.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{connection.host}:{connection.port}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{connection.db_type.toUpperCase()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                            connection.status === 'active'
                              ? 'bg-[#57d68d]/15 text-[#b8f0d1]'
                              : connection.status === 'paused'
                              ? 'bg-[#ffca6c]/15 text-[#ffe7b3]'
                              : 'bg-[#ff5e5e]/15 text-[#ffb3b3]'
                          }`}>
                            {connection.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400">{connection.last_checked_at ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.22)]">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Performance</p>
              <h2 className="mt-3 text-xl font-semibold text-white">Query latency trend</h2>
              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#071a30]/95 p-5">
                <div className="flex h-28 items-end gap-2">
                  {[55, 80, 60, 70, 45, 78, 52].map((value, index) => (
                    <div key={index} className="flex-1 rounded-t-3xl bg-gradient-to-t from-[#2f75ff] to-[#7faaff]/30" style={{ height: `${value}%` }} />
                  ))}
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="rounded-3xl bg-[#071c35]/95 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average latency</p>
                  <p className="mt-2 text-2xl font-semibold text-white">340ms</p>
                </div>
                <div className="rounded-3xl bg-[#071c35]/95 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Slow queries</p>
                  <p className="mt-2 text-2xl font-semibold text-[#ff8b4a]">4</p>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.7fr]">
            <section className="rounded-[2rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Recent issues</p>
                  <h2 className="mt-3 text-xl font-semibold text-white">Top incidents</h2>
                </div>
                <span className="rounded-full bg-[#ff8b4a]/15 px-3 py-1 text-xs font-semibold uppercase text-[#ffd3a3]">
                  Prioritized
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { title: 'High-load deadlock detected', status: 'Investigation' },
                  { title: 'Long-running query on Analytics', status: 'Auto-suggest' },
                  { title: 'Stale index on Orders DB', status: 'Optimized' },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-[#071827]/95 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{item.status}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Action recommended for next maintenance window.</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#081d3c]/95 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.22)]">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Automation</p>
              <h2 className="mt-3 text-xl font-semibold text-white">Suggested actions</h2>
              <div className="mt-6 space-y-4">
                {[
                  { label: 'Enable auto-indexing', value: 'Recommended' },
                  { label: 'Refresh statistics', value: 'Suggested' },
                  { label: 'Schedule backup', value: 'Due in 2h' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-[#071827]/95 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-200">{item.label}</p>
                      <span className="text-xs uppercase tracking-[0.24em] text-[#7faaff]">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  )
}
