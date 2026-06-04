'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

type Plan = {
  id: string
  query_text: string
  total_cost: number | null
  execution_ms: number | null
  rows_examined: number | null
  has_seq_scan: boolean
  has_index_scan: boolean
  captured_at: string
}

export default function QueryDiffPage() {
  const { selectedId, selected } = useConnection()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const qs = selectedId ? `&connectionId=${selectedId}` : ''
        const data = await apiFetch(`/api/plans?${qs}`)
        if (active) setPlans((data || []).sort((a: Plan, b: Plan) => Number(b.total_cost ?? 0) - Number(a.total_cost ?? 0)))
      } catch (err) {
        console.error('Failed to load plans', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [selectedId])

  const spotlight = plans[0]
  const seqScans = plans.filter((p) => p.has_seq_scan).length

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Query Plan Analysis</h1>
          <p className="text-slate-500 mt-2">
            {selected ? `Execution plans captured from ${selected.name}` : 'Captured EXPLAIN plans with cost and scan-type analysis.'}
          </p>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading query plans…</div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-700 font-medium">No plans captured yet</p>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Plans are captured automatically during live scans for the busiest sequentially-scanned tables.
              Keep a PostgreSQL connection selected and let a scan run, then check back.
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Stat label="Captured Plans" value={String(plans.length)} />
              <Stat label="Seq-Scan Plans" value={String(seqScans)} tone={seqScans ? 'text-amber-600' : 'text-emerald-600'} />
              <Stat label="Highest Cost" value={spotlight?.total_cost != null ? Number(spotlight.total_cost).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} tone="text-red-600" />
            </div>

            {/* Spotlight — costliest plan */}
            {spotlight && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 font-semibold">Costliest Query</h3>
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${spotlight.has_seq_scan ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {spotlight.has_seq_scan ? 'SEQ SCAN' : 'INDEXED'}
                  </span>
                </div>
                <pre className="text-slate-200 text-xs bg-slate-900 p-4 rounded-lg overflow-x-auto font-mono">{spotlight.query_text}</pre>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Metric label="Planner Cost" value={spotlight.total_cost != null ? Number(spotlight.total_cost).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} />
                  <Metric label="Est. Rows" value={spotlight.rows_examined != null ? Number(spotlight.rows_examined).toLocaleString() : '—'} />
                  <Metric label="Seq Scan" value={spotlight.has_seq_scan ? 'Yes' : 'No'} tone={spotlight.has_seq_scan ? 'text-red-600' : 'text-emerald-600'} />
                  <Metric label="Index Scan" value={spotlight.has_index_scan ? 'Yes' : 'No'} tone={spotlight.has_index_scan ? 'text-emerald-600' : 'text-slate-500'} />
                </div>
                {spotlight.has_seq_scan && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <span className="font-semibold">Recommendation:</span> this query does a sequential scan. Run
                    <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">EXPLAIN ANALYZE</code>
                    to find the filtered column, then add a B-tree index to convert it to an index scan.
                  </div>
                )}
              </div>
            )}

            {/* All captured plans */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-900 font-semibold mb-4">All Captured Plans</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Query</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Cost</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Est. Rows</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Scan</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Captured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-3 px-4 text-slate-700 text-xs font-mono max-w-md truncate">{p.query_text}</td>
                        <td className="py-3 px-4 text-slate-700">{p.total_cost != null ? Number(p.total_cost).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{p.rows_examined != null ? Number(p.rows_examined).toLocaleString() : '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${p.has_seq_scan ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {p.has_seq_scan ? 'Seq' : 'Index'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs">{new Date(p.captured_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${tone}`}>{value}</p>
    </div>
  )
}

function Metric({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  )
}
