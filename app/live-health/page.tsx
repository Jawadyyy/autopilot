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
            <h1 className="text-3xl font-bold text-white">Live Health Feed</h1>
            <p className="text-slate-400 mt-2">
              {selected ? `Continuous scan of ${selected.name}` : 'Select a connected database to begin live monitoring.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {score != null && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-slate-400">Health</p>
                <p className={`text-2xl font-bold ${healthTone(score)}`}>{score}%</p>
              </div>
            )}
            <button
              onClick={() => setScanLive(!scanLive)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-white/5 text-slate-200 hover:bg-white/10 transition"
            >
              {scanLive ? '⏸ Pause live' : '▶ Resume live'}
            </button>
          </div>
        </div>

        {scan?.autoApplied && scan.autoApplied.length > 0 && (
          <div className="p-4 rounded-lg bg-[#2f75ff]/10 border border-[#2f75ff]/30 text-sm text-[#7faaff]">
            ⚡ Autopilot auto-fixed {scan.autoApplied.length} issue(s): {scan.autoApplied.map((a) => a.issue_type).join(', ')}
          </div>
        )}

        {scanError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {scanError}
            <span className="block text-xs text-slate-500 mt-1">Some checks need <code>pg_stat_statements</code> on the target database.</span>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          <Stat label="Total Issues" value={issues.length} tone="text-white" />
          <Stat label="Critical" value={count('critical')} tone="text-red-400" />
          <Stat label="High" value={count('high')} tone="text-orange-400" />
          <Stat label="Warnings" value={count('warning')} tone="text-yellow-300" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter === f ? 'bg-[#2f75ff] text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{f !== 'all' && ` (${count(f as Severity)})`}
            </button>
          ))}
        </div>

        {!selectedId ? (
          <div className="p-6 bg-white/5 border border-white/10 rounded-[1.5rem] text-sm text-slate-300">
            No database selected. Pick one from the “Active DB” menu in the top bar.
          </div>
        ) : scanLoading && !scan ? (
          <div className="text-slate-300">Running first scan of {selected?.name}…</div>
        ) : (
          <IssuesList issues={filtered} canApply={canApply} onApply={applyFix} />
        )}
      </div>
    </AppShell>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-5">
      <p className="text-slate-400 text-xs uppercase">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${tone}`}>{value}</p>
    </div>
  )
}
