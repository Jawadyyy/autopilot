'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { QUERY_PLANS } from '@/lib/mockData'

export default function QueryDiffPage() {
  const [currentPlan] = useState(QUERY_PLANS[0])
  const [optimizedPlan] = useState(QUERY_PLANS[1])

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Query Analysis: Slow Join Investigation</h1>
          <p className="text-slate-400 mt-2">PostgreSQL v15.4 • CRITICAL LATENCY</p>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Query</h3>
          <pre className="text-slate-300 text-xs bg-black/30 p-4 rounded overflow-x-auto font-mono">
{currentPlan.query_text}
          </pre>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Current Plan</h3>
              <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded text-xs font-semibold">
                CRITICAL COST
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Cost</span>
                <span className="text-red-400 font-bold">{currentPlan.cost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Execution Time</span>
                <span className="text-red-400 font-bold">{currentPlan.execution_time}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rows</span>
                <span className="text-slate-300">{currentPlan.rows.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-400 mb-3">Plan Details</p>
              <div className="space-y-2 text-sm font-mono text-slate-400">
                <div>Sequential Scan on users u</div>
                <div className="ml-4">Nested Loop Join</div>
                <div className="ml-8">Inner Join on orders o</div>
                <div className="ml-8">No Index Coverage</div>
              </div>
            </div>
          </div>

          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Optimized Plan (Predicted)</h3>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded text-xs font-semibold">
                OPTIMIZED
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Cost</span>
                <span className="text-green-400 font-bold">{optimizedPlan.cost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Execution Time</span>
                <span className="text-green-400 font-bold">{optimizedPlan.execution_time}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rows</span>
                <span className="text-slate-300">{optimizedPlan.rows.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-400 mb-3">Plan Details</p>
              <div className="space-y-2 text-sm font-mono text-green-400">
                <div>Index Scan on orders_status_date_idx</div>
                <div className="ml-4">Hash Join</div>
                <div className="ml-8">Index Lookup on users</div>
                <div className="ml-8">Filter: status = 'completed'</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Performance Delta (Execution Time)</h3>
          <div className="flex items-end gap-4 h-32">
            <div className="flex-1 rounded-t-2xl bg-red-500/30 border-t-2 border-red-500" style={{ height: '85%' }}>
              <div className="text-center text-red-400 font-bold mt-2">850ms</div>
            </div>
            <div className="text-slate-400">vs.</div>
            <div className="flex-1 rounded-t-2xl bg-green-500/30 border-t-2 border-green-500" style={{ height: '15%' }}>
              <div className="text-center text-green-400 font-bold mt-2">12ms</div>
            </div>
          </div>
          <p className="text-center text-green-400 font-semibold mt-4">📈 98.5% Latency Reduction</p>
        </div>

        <div className="flex gap-4">
          <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition">
            ✓ Apply Optimization
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition">
            ↓ Export Plan
          </button>
        </div>
      </div>
    </AppShell>
  )
}
