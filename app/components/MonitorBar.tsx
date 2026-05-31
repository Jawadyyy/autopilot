'use client'

import { useState } from 'react'
import { useConnection, roleAtLeast } from './ConnectionContext'
import { healthTone } from './useScan'
import IssuesList from './IssuesList'

// Slim, always-on live-monitoring strip rendered under the header on every
// page. Reads the shared scan from ConnectionContext (no extra polling).
export default function MonitorBar() {
  const { selected, selectedId, scan, scanLoading, scanError, scanLive, setScanLive, role, applyFix } = useConnection()
  const [open, setOpen] = useState(false)

  if (!selectedId) return null

  const issues = scan?.issues ?? []
  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high:     issues.filter((i) => i.severity === 'high').length,
    warning:  issues.filter((i) => i.severity === 'warning').length,
  }
  const total = issues.length
  const score = scan?.healthScore ?? null
  const canApply = roleAtLeast(role, 'db_operator')

  return (
    <div className="border-b border-white/10 bg-[#0a0f1a]/70">
      <div className="px-8 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${scanLive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs uppercase tracking-widest text-slate-400">Live Monitor</span>
          <span className="text-sm font-semibold text-white">{selected?.name}</span>
        </div>

        {score != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Health</span>
            <span className={`text-sm font-bold ${healthTone(score)}`}>{score}%</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <Badge n={counts.critical} cls="bg-red-500/20 text-red-300" label="critical" />
          <Badge n={counts.high} cls="bg-orange-500/20 text-orange-300" label="high" />
          <Badge n={counts.warning} cls="bg-yellow-500/20 text-yellow-300" label="warning" />
          {total === 0 && !scanLoading && !scanError && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold">All clear</span>
          )}
          {scan?.autoApplied && scan.autoApplied.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#2f75ff]/20 text-[#7faaff] font-semibold">⚡ {scan.autoApplied.length} auto-fixed</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {scanLoading && !scan && <span className="text-xs text-slate-500">scanning…</span>}
          {scan && <span className="text-xs text-slate-500">scanned {new Date(scan.scannedAt).toLocaleTimeString()}</span>}
          <button onClick={() => setScanLive(!scanLive)} className="text-xs text-[#7faaff] hover:text-[#4b8cff]">
            {scanLive ? 'Pause' : 'Resume'}
          </button>
          {total > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#2f75ff]/15 text-[#7faaff] hover:bg-[#2f75ff]/25 transition"
            >
              {open ? 'Hide' : `View ${total} issue${total > 1 ? 's' : ''} & fixes`}
            </button>
          )}
        </div>
      </div>

      {open && total > 0 && (
        <div className="px-8 pb-4 max-h-[55vh] overflow-y-auto">
          {scanError && <p className="text-sm text-red-400 mb-2">{scanError}</p>}
          <IssuesList issues={issues} canApply={canApply} onApply={applyFix} />
        </div>
      )}
    </div>
  )
}

function Badge({ n, cls, label }: { n: number; cls: string; label: string }) {
  if (n === 0) return null
  return <span className={`px-2 py-0.5 rounded-full font-semibold ${cls}`}>{n} {label}</span>
}
