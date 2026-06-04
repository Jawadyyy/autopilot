'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

type Plan = {
  id: string
  query_text: string
  query_hash?: string
  total_cost: number | null
  rows_examined: number | null
  has_seq_scan: boolean
  execution_ms: number | null
  captured_at: string
}

export default function JSONExplorerPage() {
  const { selectedId } = useConnection()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Plan | null>(null)
  const [planJson, setPlanJson] = useState<any>(null)
  const [jsonLoading, setJsonLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const qs = selectedId ? `?connectionId=${selectedId}` : ''
        const data = await apiFetch(`/api/plans${qs}`)
        if (active) setPlans(data || [])
      } catch (err) {
        console.error('Failed to load plans', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [selectedId])

  async function openPlan(p: Plan) {
    setSelected(p)
    setPlanJson(null)
    setJsonLoading(true)
    try {
      const full = await apiFetch(`/api/plans?id=${p.id}`)
      setPlanJson(full?.plan_json ?? null)
    } catch {
      setPlanJson(null)
    } finally {
      setJsonLoading(false)
    }
  }

  const filtered = plans.filter((p) =>
    !search || p.query_text.toLowerCase().includes(search.toLowerCase()) || (p.query_hash ?? '').includes(search)
  )

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">JSON Plan Explorer</h1>
          <p className="text-slate-500 mt-2">Browse the raw JSONB execution plans captured from your monitored databases.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Captured Plans</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{plans.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Seq-Scan Plans</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{plans.filter((p) => p.has_seq_scan).length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Stored As</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">JSONB</p>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search query text or hash…"
          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
        />

        {loading ? (
          <div className="text-slate-500">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-700 font-medium">No plans captured yet</p>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Plans are captured automatically during live scans of PostgreSQL connections. Select a database and let a scan run.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
            {/* List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 max-h-[70vh] overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPlan(p)}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    selected?.id === p.id ? 'border-[#2f6bff] ring-2 ring-[#2f6bff]/20 bg-[#f5f8ff]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.has_seq_scan ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.has_seq_scan ? 'SEQ SCAN' : 'INDEXED'}
                    </span>
                    <span className="text-xs text-slate-400">cost {p.total_cost != null ? Number(p.total_cost).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}</span>
                  </div>
                  <p className="mt-2 text-xs font-mono text-slate-700 truncate">{p.query_text}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-slate-400 p-4">No plans match “{search}”.</p>}
            </div>

            {/* Detail */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {!selected ? (
                <p className="text-slate-400 text-sm">Select a plan to inspect its JSONB document.</p>
              ) : (
                <>
                  <h3 className="text-slate-900 font-semibold mb-1">Plan Document</h3>
                  <p className="text-xs font-mono text-slate-500 mb-4 break-all">{selected.query_text}</p>
                  {jsonLoading ? (
                    <p className="text-slate-400 text-sm">Loading JSON…</p>
                  ) : planJson ? (
                    <pre className="text-slate-200 text-xs bg-slate-900 p-4 rounded-lg overflow-auto font-mono max-h-[55vh]">
{JSON.stringify(planJson, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-slate-400 text-sm">No JSON stored for this plan.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
