'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import IssuesList from '../components/IssuesList'
import { useConnection, roleAtLeast } from '../components/ConnectionContext'
import { healthTone, type Severity } from '../components/useScan'

const FILTERS = ['all', 'critical', 'high', 'warning', 'info'] as const
type FilterType = (typeof FILTERS)[number]

export default function LiveHealthPage() {
  const { selected, selectedId, scan, scanLoading, scanError, scanLive, setScanLive, role, applyFix } = useConnection()
  const [filter, setFilter] = useState<FilterType>('all')

  const issues = scan?.issues ?? []
  const filtered = issues.filter((e) => filter === 'all' || e.severity === (filter as Severity))
  const score = scan?.healthScore ?? null
  const canApply = roleAtLeast(role, 'db_operator')
  const count = (s: Severity) => issues.filter((i) => i.severity === s).length

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Live Health Feed</h1>
            <p className="text-slate-500 mt-2">
              {selected ? `Continuous scan of ${selected.name}` : 'Select a connected database to begin live monitoring.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {score != null && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider font-medium text-slate-400">Health</p>
                <p className={`text-2xl font-bold ${healthTone(score)}`}>{score}%</p>
              </div>
            )}
            <button
              onClick={() => setScanLive(!scanLive)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              {scanLive ? '⏸ Pause live' : '▶ Resume live'}
            </button>
          </div>
        </div>

        {scan?.autoApplied && scan.autoApplied.length > 0 && (
          <div className="p-4 rounded-xl bg-[#eef3ff] border border-[#cfddff] text-sm text-[#1f54e0]">
            ⚡ Autopilot auto-fixed {scan.autoApplied.length} issue(s): {scan.autoApplied.map((a) => a.issue_type).join(', ')}
          </div>
        )}

        {scanError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {scanError}
            <span className="block text-xs text-slate-400 mt-1">Some checks need <code>pg_stat_statements</code> on the target database.</span>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          <Stat label="Total Issues" value={issues.length} tone="text-slate-900" />
          <Stat label="Critical" value={count('critical')} tone="text-red-600" />
          <Stat label="High" value={count('high')} tone="text-orange-600" />
          <Stat label="Warnings" value={count('warning')} tone="text-amber-600" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter === f ? 'bg-[#2f6bff] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{f !== 'all' && ` (${count(f as Severity)})`}
            </button>
          ))}
        </div>

        {!selectedId ? (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-sm text-slate-600 shadow-sm">
            No database selected. Pick one from the “Active DB” menu in the top bar.
          </div>
        ) : scanLoading && !scan ? (
          <div className="text-slate-500">Running first scan of {selected?.name}…</div>
        ) : (
          <IssuesList issues={filtered} canApply={canApply} onApply={applyFix} />
        )}
      </div>
    </AppShell>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${tone}`}>{value}</p>
    </div>
  )
}
