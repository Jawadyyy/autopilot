'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { CLUSTERS, HEALTH_EVENTS } from '@/lib/mockData'

export default function DashboardPage() {
  const [events, setEvents] = useState(HEALTH_EVENTS)

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setEvents(prev => [...prev.slice(-4), {
        ...prev[0],
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
      }])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Global Fleet Overview</h1>
          <p className="text-slate-400 mt-2">Monitoring {CLUSTERS.length} active clusters across {CLUSTERS.reduce((sum, c) => sum + c.connections.length, 0)} regions</p>
        </div>

        {/* Cluster Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {CLUSTERS.map(cluster => (
            <div key={cluster.id} className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6 hover:border-[#2f75ff]/30 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{cluster.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{cluster.region}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  cluster.status === 'healthy' ? 'bg-green-500/20 text-green-300' :
                  cluster.status === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  ● {cluster.status === 'healthy' ? 'Healthy' : cluster.status === 'warning' ? 'Warning' : 'Critical'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Active Sessions</span>
                  <span className="text-sm font-semibold text-white">{cluster.active_sessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Uptime</span>
                  <span className="text-sm font-semibold text-white">{cluster.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Query Latency</span>
                  <span className="text-sm font-semibold text-white">{cluster.query_latency}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-400">Connections</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {cluster.connections.map((conn, i) => (
                    <span key={i} className="text-xs bg-[#2f75ff]/15 text-[#8ab9ff] px-2 py-1 rounded">
                      {conn}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">Total Databases</p>
            <p className="text-3xl font-bold text-white mt-3">24</p>
            <p className="text-xs text-slate-400 mt-2">Monitored</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">Active Alerts</p>
            <p className="text-3xl font-bold text-red-400 mt-3">5</p>
            <p className="text-xs text-slate-400 mt-2">Requiring attention</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">Avg Latency</p>
            <p className="text-3xl font-bold text-white mt-3">45ms</p>
            <p className="text-xs text-slate-400 mt-2">Query response</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">System Health</p>
            <p className="text-3xl font-bold text-green-400 mt-3">94%</p>
            <p className="text-xs text-slate-400 mt-2">Overall score</p>
          </div>
        </div>

        {/* Live Feed */}
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
