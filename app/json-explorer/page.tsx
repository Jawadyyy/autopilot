'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '@/lib/api'

export default function JSONExplorerPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await apiFetch('/api/plans?hasSeqScan=true')
        setPlans(data)
      } catch (err) {
        console.error('Failed to load JSON plans', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlans()
  }, [])

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">JSON Query Explorer</h1>
          <p className="text-slate-400 mt-2">Analyzing execution plans captured from your monitored databases.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search query hashes..."
            className="col-span-2 px-4 py-2 bg-[#0c1628] border border-white/10 rounded text-white placeholder-slate-500 focus:border-[#2f75ff] transition"
          />
          <button className="bg-[#2f75ff] hover:bg-[#4b8cff] text-white font-semibold py-2 px-4 rounded-lg transition">
            Execute Query
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Total Captured</p>
            <p className="text-2xl font-bold text-white mt-2">{plans.length}</p>
            <p className="text-xs text-slate-500 mt-1">Captured plans</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Scan Rate</p>
            <p className="text-2xl font-bold text-white mt-2">{plans.length ? Math.round(plans.length / 10) : 0}ms</p>
            <p className="text-xs text-slate-500 mt-1">Estimated per query</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Operations</p>
            <div className="flex gap-2 mt-2">
              <button className="text-[#2f75ff] hover:text-[#4b8cff] text-xs">Seq Scan</button>
              <button className="text-slate-400 hover:text-white text-xs">Index Scan</button>
              <button className="text-slate-400 hover:text-white text-xs">Hash Join</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-300">Loading plans...</div>
        ) : (
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h3 className="text-white font-semibold mb-4">Found {plans.length} matched plans</h3>
            <div className="space-y-3">
              {plans.map((plan, i) => (
                <div key={plan.id ?? i} className="bg-black/20 rounded-lg p-4 border border-white/5 hover:border-[#2f75ff]/30 transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          plan.has_seq_scan ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                          {plan.has_seq_scan ? 'SEQ SCAN' : 'OPTIMIZED'}
                        </span>
                        <code className="text-white font-mono">{plan.query_hash ?? plan.id}</code>
                      </div>
                      <p className="text-slate-400 text-sm mt-2">
                        Total cost: <span className="font-semibold text-white">{plan.total_cost?.toFixed(2) ?? 'N/A'}</span> • Rows: <span className="font-semibold text-white">{plan.rows_examined?.toLocaleString() ?? 'N/A'}</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">Latency: {plan.execution_ms ?? 'N/A'}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Sample JSON Plan</h3>
          <pre className="text-slate-300 text-xs bg-black/30 p-4 rounded overflow-x-auto font-mono">
{JSON.stringify({
  Plan: {
    'Node Type': 'Seq Scan',
    'Relation Name': 'transactions',
    Alias: 't',
    'Startup Cost': 0.0,
    'Total Cost': 45201.22,
    'Plan Rows': 42881,
    'Plan Width': 24,
    Filter: "(created_at > (now() - '24 hours'::interval))",
  },
  'Planning Time': 0.234,
  'Execution Time': 850.12,
}, null, 2)}
          </pre>
        </div>
      </div>
    </AppShell>
  )
}
