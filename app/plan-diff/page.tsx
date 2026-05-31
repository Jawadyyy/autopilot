'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '@/lib/api'

export default function QueryDiffPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await apiFetch('/api/plans?hasSeqScan=true')
        setPlans(data)
      } catch (err) {
        console.error('Failed to load plans', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlans()
  }, [])

  const currentPlan = plans[0]
  const optimizedPlan = plans[1]

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Query Analysis</h1>
          <p className="text-slate-400 mt-2">Review captured execution plans and compare optimization potential.</p>
        </div>

        {loading ? (
          <div className="text-slate-300">Loading query plans...</div>
        ) : (!currentPlan || !optimizedPlan) ? (
          <div className="text-slate-300">No plans available for diff analysis.</div>
        ) : (
          <>
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
                    CURRENT
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cost</span>
                    <span className="text-red-400 font-bold">{currentPlan.total_cost?.toFixed(2) ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Execution Time</span>
                    <span className="text-red-400 font-bold">{currentPlan.execution_ms ?? 'N/A'}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rows</span>
                    <span className="text-slate-300">{currentPlan.rows_examined?.toLocaleString() ?? 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-slate-400 mb-3">Plan Details</p>
                  <div className="space-y-2 text-sm font-mono text-slate-400">
                    <div>{currentPlan.has_seq_scan ? 'Seq Scan present' : 'No Seq Scan detected'}</div>
                    <div className="ml-4">Has Index Scan: {currentPlan.has_index_scan ? 'Yes' : 'No'}</div>
                    <div className="ml-4">Plan Type: {currentPlan.plan_type}</div>
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
                    <span className="text-green-400 font-bold">{optimizedPlan.total_cost?.toFixed(2) ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Execution Time</span>
                    <span className="text-green-400 font-bold">{optimizedPlan.execution_ms ?? 'N/A'}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rows</span>
                    <span className="text-slate-300">{optimizedPlan.rows_examined?.toLocaleString() ?? 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-slate-400 mb-3">Plan Details</p>
                  <div className="space-y-2 text-sm font-mono text-green-400">
                    <div>{optimizedPlan.has_seq_scan ? 'Seq Scan present' : 'No Seq Scan detected'}</div>
                    <div className="ml-4">Has Index Scan: {optimizedPlan.has_index_scan ? 'Yes' : 'No'}</div>
                    <div className="ml-4">Plan Type: {optimizedPlan.plan_type}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
              <h3 className="text-white font-semibold mb-4">Performance Delta (Execution Time)</h3>
              <div className="flex items-end gap-4 h-32">
                <div className="flex-1 rounded-t-2xl bg-red-500/30 border-t-2 border-red-500" style={{ height: currentPlan.execution_ms ? `${Math.min(100, (currentPlan.execution_ms / Math.max(optimizedPlan.execution_ms || 1, 1)) )}%` : '65%' }}>
                  <div className="text-center text-red-400 font-bold mt-2">{currentPlan.execution_ms ?? 'N/A'}ms</div>
                </div>
                <div className="text-slate-400">vs.</div>
                <div className="flex-1 rounded-t-2xl bg-green-500/30 border-t-2 border-green-500" style={{ height: optimizedPlan.execution_ms ? `${Math.min(100, (optimizedPlan.execution_ms / Math.max(currentPlan.execution_ms || 1, 1)) )}%` : '25%' }}>
                  <div className="text-center text-green-400 font-bold mt-2">{optimizedPlan.execution_ms ?? 'N/A'}ms</div>
                </div>
              </div>
              <p className="text-center text-green-400 font-semibold mt-4">{currentPlan.execution_ms && optimizedPlan.execution_ms ? `${Math.max(0, Math.round((1 - optimizedPlan.execution_ms / currentPlan.execution_ms) * 100))}% Latency Reduction` : 'Comparison unavailable'}</p>
            </div>

            <div className="flex gap-4">
              <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition">
                Apply Optimization
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition">
                ↓ Export Plan
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
