'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { LOCKS } from '@/lib/mockData'

export default function LocksPage() {
  const [locks] = useState(LOCKS)
  const [expandedLock, setExpandedLock] = useState<number | null>(null)

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Concurrency & Locks</h1>
            <p className="text-slate-400 mt-2">Search PID or Session... • Cluster: PRODUCTION-CLUSTER-01 • Region: US-EAST-1</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-semibold">12 Waiters</span>
            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm font-semibold">03 Blockers</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Avg Lock Wait</p>
            <p className="text-2xl font-bold text-white mt-2">4.2s</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Total Row Locks</p>
            <p className="text-2xl font-bold text-white mt-2">282</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Tx Success Rate</p>
            <p className="text-2xl font-bold text-green-400 mt-2">98.2%</p>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Active Sessions</h3>
          <div className="space-y-3">
            {locks.map((lock, i) => (
              <div
                key={i}
                onClick={() => setExpandedLock(expandedLock === i ? null : i)}
                className={`p-4 rounded-lg border cursor-pointer transition ${
                  lock.state === 'blocker' ? 'border-red-500/50 bg-red-500/10' :
                  lock.state === 'waiting' ? 'border-yellow-500/50 bg-yellow-500/10' :
                  lock.state === 'active' ? 'border-blue-500/50 bg-blue-500/10' :
                  'border-slate-700 bg-slate-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        lock.state === 'blocker' ? 'bg-red-500/30 text-red-300' :
                        lock.state === 'waiting' ? 'bg-yellow-500/30 text-yellow-300' :
                        lock.state === 'active' ? 'bg-blue-500/30 text-blue-300' :
                        'bg-slate-600/30 text-slate-300'
                      }`}>
                        {lock.state.toUpperCase()}
                      </span>
                      <span className="text-white font-semibold">PID {lock.pid}</span>
                      {lock.blocker_pid && (
                        <span className="text-xs text-slate-400">blocked by PID {lock.blocker_pid}</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-2 font-mono">{lock.query_snippet}</p>
                    <p className="text-slate-500 text-xs mt-1">Duration: {lock.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{lock.duration}</p>
                    <button className="text-xs text-slate-400 hover:text-red-400 mt-2">
                      Terminate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Lock Dependency Graph</h3>
          <div className="bg-black/20 rounded-lg p-8 flex items-center justify-center min-h-32">
            <div className="text-center">
              <p className="text-slate-400">Graph view showing 4 more dependencies on 'idx_orders_status'</p>
              <button className="text-[#2f75ff] hover:text-[#4b8cff] text-sm mt-2">Expand Map</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
