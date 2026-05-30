'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { QUERY_PLANS } from '@/lib/mockData'

export default function JSONExplorerPage() {
  const [executedPlans] = useState([
    { hash: '0xAF8230', cost: 45201.22, status: 'CRITICAL COST', rows: 42881 },
    { hash: '0x228B1F', cost: 482.12, status: 'OPTIMIZED', rows: 12 },
    { hash: '0x93SCBA', cost: 12940.88, status: 'WARNING SORT', rows: 6420 },
  ])

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">JSON Query Explorer</h1>
          <p className="text-slate-400 mt-2">Analyzing NoSQL execution plans from pg_stat_plans_jsonb</p>
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
            <p className="text-2xl font-bold text-white mt-2">42.8k</p>
            <p className="text-xs text-slate-500 mt-1">Scan Date</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Scan Rate</p>
            <p className="text-2xl font-bold text-white mt-2">14ms</p>
            <p className="text-xs text-slate-500 mt-1">Per Query Avg</p>
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

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Found 128 matched plans</h3>
          <div className="space-y-3">
            {executedPlans.map((plan, i) => (
              <div key={i} className="bg-black/20 rounded-lg p-4 border border-white/5 hover:border-[#2f75ff]/30 transition cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        plan.status === 'CRITICAL COST' ? 'bg-red-500/20 text-red-300' :
                        plan.status === 'OPTIMIZED' ? 'bg-green-500/20 text-green-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {plan.status}
                      </span>
                      <code className="text-white font-mono">{plan.hash}</code>
                    </div>
                    <p className="text-slate-400 text-sm mt-2">
                      Total cost: <span className="font-semibold text-white">{plan.cost.toFixed(2)}</span> • Rows: <span className="font-semibold text-white">{plan.rows.toLocaleString()}</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">Latency: 42ms</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Sample JSON Plan</h3>
          <pre className="text-slate-300 text-xs bg-black/30 p-4 rounded overflow-x-auto font-mono">
{JSON.stringify({
  "Plan": {
    "Node Type": "Seq Scan",
    "Relation Name": "transactions",
    "Alias": "t",
    "Startup Cost": 0.00,
    "Total Cost": 45201.22,
    "Plan Rows": 42881,
    "Plan Width": 24,
    "Filter": "(created_at > (now() - '24 hours'::interval))"
  },
  "Planning Time": 0.234,
  "Execution Time": 850.12
}, null, 2)}
          </pre>
        </div>
      </div>
    </AppShell>
  )
}
