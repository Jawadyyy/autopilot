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

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Performance Tuning Report</h1>
            <p className="text-slate-400 mt-2">
              {selected ? `Live from pg_stat_statements • ${selected.name}` : 'Select a connected database to generate its report.'}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-white text-black hover:bg-slate-200 font-semibold py-2 px-6 rounded-lg transition"
          >
            ↓ Export as PDF
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
            <span className="block text-xs text-slate-500 mt-1">
              The performance report needs <code>pg_stat_statements</code> enabled on the target database.
            </span>
          </div>
        )}

        {loading ? (
          <div className="text-slate-300">Generating report...</div>
        ) : !selectedId ? (
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
            No database selected. Pick one from the “Active DB” menu in the top bar.
          </div>
        ) : !error && report ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
                <p className="text-slate-400 text-sm uppercase">Overall Health Score</p>
                <p className={`text-5xl font-bold mt-3 ${score != null && score >= 80 ? 'text-green-400' : score != null && score >= 50 ? 'text-yellow-300' : 'text-red-400'}`}>
                  {score != null ? `${score}%` : '—'}
                </p>
                <p className="text-slate-400 text-xs mt-3">Computed from unresolved issues</p>
              </div>
              <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
                <p className="text-slate-400 text-sm uppercase">Slow Queries</p>
                <p className="text-5xl font-bold text-white mt-3">{slow.length}</p>
                <p className="text-slate-400 text-xs mt-3">Top entries by mean exec time</p>
              </div>
              <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
                <p className="text-slate-400 text-sm uppercase">Autopilot Fixes Applied</p>
                <p className="text-5xl font-bold text-[#7faaff] mt-3">{fixesApplied}</p>
                <p className="text-slate-400 text-xs mt-3">On this connection</p>
              </div>
            </div>

            <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
              <h3 className="text-white font-semibold mb-4">Top Slowest Queries</h3>
              {slow.length === 0 ? (
                <p className="text-slate-400 text-sm">No slow queries recorded. (Run some workload, then refresh.)</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold">QUERY</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold">CALLS</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold">MEAN</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold">MAX</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-semibold">ROWS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slow.map((q, i) => (
                        <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition">
                          <td className="py-3 px-4 text-white text-xs font-mono max-w-md truncate">{q.query}</td>
                          <td className="py-3 px-4 text-slate-300">{q.calls?.toLocaleString?.() ?? q.calls}</td>
                          <td className="py-3 px-4 text-yellow-300 font-semibold">{q.mean_ms}ms</td>
                          <td className="py-3 px-4 text-red-400">{q.max_ms}ms</td>
                          <td className="py-3 px-4 text-slate-300">{q.rows?.toLocaleString?.() ?? q.rows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
              <h3 className="text-white font-semibold mb-4">Recent Autopilot Actions</h3>
              {fixesApplied === 0 ? (
                <p className="text-slate-400 text-sm">No fixes applied yet on this connection.</p>
              ) : (
                <div className="space-y-2">
                  {report.fixes.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg p-3 text-sm">
                      <div>
                        <span className="text-white font-medium">{f.action_type}</span>
                        {f.affected_table && <span className="text-slate-400"> · {f.affected_table}</span>}
                      </div>
                      <span className="text-xs text-slate-500">{new Date(f.applied_at).toLocaleString()}</span>
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
