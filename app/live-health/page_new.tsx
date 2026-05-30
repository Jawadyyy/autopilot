'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { HEALTH_EVENTS } from '@/lib/mockData'

export default function LiveHealthPage() {
  const [events] = useState(HEALTH_EVENTS)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')

  const filteredEvents = events.filter(e => filter === 'all' || e.severity === filter)

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Health Feed</h1>
          <p className="text-slate-400 mt-2">Monitoring {HEALTH_EVENTS.length} active instances across 3 regions</p>
        </div>

        <div className="flex gap-2">
          {['all', 'critical', 'warning', 'info'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter === f
                  ? 'bg-[#2f75ff] text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredEvents.map(event => (
            <div key={event.id} className={`bg-[#0c1628] border-l-4 rounded-[1rem] p-4 ${
              event.severity === 'critical' ? 'border-red-500 bg-red-500/5' :
              event.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/5' :
              'border-blue-500 bg-blue-500/5'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${
                      event.severity === 'critical' ? '🔴' :
                      event.severity === 'warning' ? '⚠️' : 'ℹ️'
                    }`}></span>
                    <h3 className="text-white font-semibold">{event.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      event.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                      event.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {event.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{event.description}</p>
                  {event.query_snippet && (
                    <p className="text-slate-500 text-xs font-mono mt-2 bg-black/20 p-2 rounded">
                      {event.query_snippet}
                    </p>
                  )}
                  {event.table_name && (
                    <p className="text-slate-400 text-xs mt-2">
                      <span className="font-semibold">Table:</span> {event.table_name}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs text-slate-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                    event.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {event.status === 'active' ? 'Active' : 'Resolved'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-slate-400 text-sm">Total Events (Last Hour)</p>
            <p className="text-3xl font-bold text-white mt-2">{events.length}</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-slate-400 text-sm">Critical Alerts</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{events.filter(e => e.severity === 'critical').length}</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-slate-400 text-sm">Resolved</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{events.filter(e => e.status === 'resolved').length}</p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
