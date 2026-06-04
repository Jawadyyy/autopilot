'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell'
import { useConnection } from '../components/ConnectionContext'
import { apiFetch } from '@/lib/api'

type Column = { name: string; type: string; nullable: boolean; pk: boolean; fk: { table: string; column: string } | null }
type Table = {
  name: string
  rows: number | null
  deadRows: number | null
  sizeBytes: number | null
  bloatPct: number | null
  seqScan: number | null
  idxScan: number | null
  columns: Column[]
  issues: { severity: string; label: string }[]
}
type Relationship = { from: string; fromColumn: string; to: string; toColumn: string }
type SchemaGraph = { tables: Table[]; relationships: Relationship[] }

function fmtBytes(b: number | null): string {
  if (b == null) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

const shortType = (t: string) =>
  t.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz')
   .replace('timestamp without time zone', 'timestamp').replace('double precision', 'float8')

export default function SchemaPage() {
  const { selectedId, selected } = useConnection()
  const [graph, setGraph] = useState<SchemaGraph | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; key: string }[]>([])

  useEffect(() => {
    let on = true
    async function load() {
      if (!selectedId) { setGraph(null); setLoading(false); return }
      if (selected && selected.db_type !== 'postgresql') {
        setError('Schema browser is available for PostgreSQL connections only.'); setLoading(false); return
      }
      setLoading(true); setError('')
      try {
        const res = await apiFetch(`/api/monitor?connectionId=${selectedId}&type=schema`)
        if (on) setGraph(res.data ?? res)
      } catch (err) {
        if (on) setError(err instanceof Error ? err.message : 'Failed to load schema')
      } finally {
        if (on) setLoading(false)
      }
    }
    load()
    return () => { on = false }
  }, [selectedId, selected])

  // Compute FK connector lines between entity cards.
  const recompute = useCallback(() => {
    const container = containerRef.current
    if (!container || !graph) { setLines([]); return }
    const base = container.getBoundingClientRect()
    const next: typeof lines = []
    for (const rel of graph.relationships) {
      const a = cardRefs.current.get(rel.from)
      const b = cardRefs.current.get(rel.to)
      if (!a || !b || a === b) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      next.push({
        key: `${rel.from}.${rel.fromColumn}->${rel.to}.${rel.toColumn}`,
        x1: ra.left + ra.width / 2 - base.left, y1: ra.top + ra.height / 2 - base.top,
        x2: rb.left + rb.width / 2 - base.left, y2: rb.top + rb.height / 2 - base.top,
      })
    }
    setLines(next)
  }, [graph])

  useLayoutEffect(() => { recompute() }, [recompute, active])
  useEffect(() => {
    const handler = () => recompute()
    window.addEventListener('resize', handler)
    const ro = new ResizeObserver(handler)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => { window.removeEventListener('resize', handler); ro.disconnect() }
  }, [recompute])

  const tables = graph?.tables ?? []
  const totalRows = tables.reduce((s, t) => s + (t.rows ?? 0), 0)
  const totalSize = tables.reduce((s, t) => s + (t.sizeBytes ?? 0), 0)
  const withIssues = tables.filter((t) => t.issues.length > 0).length

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Schema Diagram</h1>
          <p className="text-slate-500 mt-2">
            {selected ? `Entity-relationship map of ${selected.name} · ${tables.length} tables` : 'Select a connected database to inspect its schema.'}
          </p>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        {!loading && !error && !selectedId && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 shadow-sm">No database selected. Pick one from the “Active DB” menu in the top bar.</div>
        )}

        {selectedId && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Tables" value={String(tables.length)} />
            <Stat label="Total Rows" value={totalRows.toLocaleString()} />
            <Stat label="On-Disk Size" value={fmtBytes(totalSize)} />
            <Stat label="Tables w/ Issues" value={String(withIssues)} tone={withIssues ? 'text-amber-600' : 'text-emerald-600'} />
          </div>
        )}

        {loading ? (
          <div className="text-slate-500">Loading schema…</div>
        ) : tables.length === 0 && selectedId && !error ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-500 text-sm shadow-sm">
            No user tables found in the public schema.
          </div>
        ) : tables.length > 0 ? (
          <div ref={containerRef} className="relative">
            {/* FK connector overlay */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
              <defs>
                <marker id="fk-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                </marker>
              </defs>
              {lines.map((l) => {
                const mx = (l.x1 + l.x2) / 2
                return (
                  <path
                    key={l.key}
                    d={`M ${l.x1} ${l.y1} C ${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`}
                    fill="none" stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#fk-arrow)"
                  />
                )
              })}
            </svg>

            <div className="relative grid gap-5 sm:grid-cols-2 xl:grid-cols-3" style={{ zIndex: 1 }}>
              {tables.map((t) => (
                <div
                  key={t.name}
                  ref={(el) => { if (el) cardRefs.current.set(t.name, el); else cardRefs.current.delete(t.name) }}
                  onClick={() => setActive(active === t.name ? null : t.name)}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition cursor-pointer ${
                    active === t.name ? 'border-[#2f6bff] ring-2 ring-[#2f6bff]/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Entity header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <span className="font-semibold text-slate-900 font-mono text-sm truncate">{t.name}</span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{t.rows?.toLocaleString() ?? '—'} rows · {fmtBytes(t.sizeBytes)}</span>
                  </div>

                  {t.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                      {t.issues.map((i, k) => (
                        <span key={k} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          i.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-800'
                        }`}>{i.label}</span>
                      ))}
                    </div>
                  )}

                  {/* Columns */}
                  <div className="divide-y divide-slate-50">
                    {t.columns.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 px-4 py-1.5 text-xs">
                        <span className="flex w-9 shrink-0 gap-1">
                          {c.pk && <span title="Primary key" className="text-amber-500 font-bold">PK</span>}
                          {c.fk && <span title={`References ${c.fk.table}.${c.fk.column}`} className="text-[#2f6bff] font-bold">FK</span>}
                        </span>
                        <span className={`font-mono ${c.pk ? 'font-semibold text-slate-900' : 'text-slate-700'} truncate`}>{c.name}</span>
                        <span className="ml-auto font-mono text-slate-400 truncate">{shortType(c.type)}{c.nullable ? '' : ' ·'}</span>
                      </div>
                    ))}
                  </div>

                  {active === t.name && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
                      Seq scans: {t.seqScan ?? 0} · Index scans: {t.idxScan ?? 0} · Dead rows: {t.deadRows?.toLocaleString() ?? 0}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Relationships list */}
        {graph && graph.relationships.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-slate-900 font-semibold mb-3">Foreign-Key Relationships</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {graph.relationships.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-600">
                  <span className="text-slate-900">{r.from}</span>
                  <span className="text-slate-400">.{r.fromColumn}</span>
                  <span className="text-[#2f6bff]">→</span>
                  <span className="text-slate-900">{r.to}</span>
                  <span className="text-slate-400">.{r.toColumn}</span>
                </div>
              ))}
            </div>
          </div>
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
