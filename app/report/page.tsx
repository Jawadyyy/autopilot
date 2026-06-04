'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

type SlowQuery = { query: string; calls: number; mean_ms: number; max_ms: number; total_ms: number; rows: number }
type TableStat = { tablename: string; seq_scan: number; idx_scan: number; n_live_tup: number; bloat_pct: number }
type Fix = { action_type: string; status: string; applied_at: string; outcome_notes: string | null; affected_table: string | null }
type Report = {
  slowQueries: SlowQuery[]
  tableStats: TableStat[]
  healthScore: number | null
  fixes: Fix[]
}

export default function ReportPage() {
  const { selectedId, selected } = useConnection()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!selectedId) { setReport(null); setLoading(false); return }
      setLoading(true)
      setError('')
      try {
        const data = await apiFetch(`/api/reports?type=performance&connectionId=${selectedId}`)
        if (active) setReport(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [selectedId])

  const score = report?.healthScore ?? null
  const fixesApplied = report?.fixes?.length ?? 0
  const slow = report?.slowQueries ?? []

  // Derived analysis for the executive summary
  const meanAvg = slow.length ? slow.reduce((s, q) => s + Number(q.mean_ms || 0), 0) / slow.length : 0
  const worst = slow.reduce((a, b) => (Number(b.mean_ms || 0) > Number(a?.mean_ms || 0) ? b : a), slow[0])
  const verdict = score == null ? 'Unknown'
    : score >= 80 ? 'Healthy' : score >= 50 ? 'Degraded — needs attention' : 'At risk — act now'

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Print-only report header */}
        <div className="print-only mb-6 border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">DB Autopilot — Performance Report</h1>
          <p className="text-sm text-slate-600 mt-1">
            {selected?.name ?? '—'} · Generated {new Date().toLocaleString()}
          </p>
        </div>

        <div className="flex justify-between items-center no-print">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Performance Tuning Report</h1>
            <p className="text-slate-500 mt-2">
              {selected ? `Live from pg_stat_statements • ${selected.name}` : 'Select a connected database to generate its report.'}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-slate-900 text-white hover:bg-slate-800 font-semibold py-2 px-5 rounded-lg transition shadow-sm"
          >
            ↓ Export as PDF
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
            <span className="block text-xs text-slate-400 mt-1">
              The performance report needs <code>pg_stat_statements</code> enabled on the target database.
            </span>
          </div>
        )}

        {loading ? (
          <div className="text-slate-500">Generating report...</div>
        ) : !selectedId ? (
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 shadow-sm">
            No database selected. Pick one from the “Active DB” menu in the top bar.
          </div>
        ) : !error && report ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-400 text-sm uppercase tracking-wider font-medium">Overall Health Score</p>
                <p className={`text-5xl font-bold mt-3 ${score != null && score >= 80 ? 'text-emerald-600' : score != null && score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {score != null ? `${score}%` : '—'}
                </p>
                <p className="text-slate-400 text-xs mt-3">Computed from unresolved issues</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-400 text-sm uppercase tracking-wider font-medium">Slow Queries</p>
                <p className="text-5xl font-bold text-slate-900 mt-3">{slow.length}</p>
                <p className="text-slate-400 text-xs mt-3">Top entries by mean exec time</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print-card">
                <p className="text-slate-400 text-sm uppercase tracking-wider font-medium">Autopilot Fixes Applied</p>
                <p className="text-5xl font-bold text-[#2f6bff] mt-3">{fixesApplied}</p>
                <p className="text-slate-400 text-xs mt-3">On this connection</p>
              </div>
            </div>

            {/* Executive summary / analysis */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print-card">
              <h3 className="text-slate-900 font-semibold mb-3">Executive Summary</h3>
              <p className="text-sm leading-7 text-slate-600">
                Overall health is <span className="font-semibold text-slate-900">{verdict}</span>
                {score != null && <> (score {score}%)</>}. The connection has{' '}
                <span className="font-semibold text-slate-900">{slow.length}</span> notable slow quer{slow.length === 1 ? 'y' : 'ies'}
                {slow.length > 0 && <> averaging <span className="font-semibold text-slate-900">{meanAvg.toFixed(0)}ms</span></>}
                {worst && <>, with the slowest averaging <span className="font-semibold text-red-600">{Number(worst.mean_ms).toFixed(0)}ms</span> over {Number(worst.calls).toLocaleString()} calls</>}.{' '}
                Autopilot has applied <span className="font-semibold text-slate-900">{fixesApplied}</span> fix{fixesApplied === 1 ? '' : 'es'} on this database.
              </p>
              {slow.length > 0 && (
                <p className="text-sm leading-7 text-slate-600 mt-2">
                  <span className="font-semibold text-slate-700">Recommendation:</span>{' '}
                  {meanAvg > 1000
                    ? 'Average query latency is high — capture EXPLAIN ANALYZE on the top entries and add covering indexes or rewrite the heaviest queries.'
                    : 'Latency is moderate. Index the most frequently scanned tables and keep autovacuum tuned to prevent bloat.'}
                </p>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-900 font-semibold mb-4">Top Slowest Queries</h3>
              {slow.length === 0 ? (
                <p className="text-slate-500 text-sm">No slow queries recorded. (Run some workload, then refresh.)</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Query</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Calls</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Mean</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Max</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">Rows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slow.map((q, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-3 px-4 text-slate-700 text-xs font-mono max-w-md truncate">{q.query}</td>
                          <td className="py-3 px-4 text-slate-600">{q.calls?.toLocaleString?.() ?? q.calls}</td>
                          <td className="py-3 px-4 text-amber-600 font-semibold">{q.mean_ms}ms</td>
                          <td className="py-3 px-4 text-red-600">{q.max_ms}ms</td>
                          <td className="py-3 px-4 text-slate-600">{q.rows?.toLocaleString?.() ?? q.rows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-slate-900 font-semibold mb-4">Recent Autopilot Actions</h3>
              {fixesApplied === 0 ? (
                <p className="text-slate-500 text-sm">No fixes applied yet on this connection.</p>
              ) : (
                <div className="space-y-2">
                  {report.fixes.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                      <div>
                        <span className="text-slate-900 font-medium">{f.action_type}</span>
                        {f.affected_table && <span className="text-slate-400"> · {f.affected_table}</span>}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(f.applied_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}
