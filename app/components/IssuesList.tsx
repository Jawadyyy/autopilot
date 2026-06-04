'use client'

import { useState } from 'react'
import { SEVERITY_STYLES, type ScanIssue } from './useScan'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-[10px] uppercase tracking-wide px-2 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
    >
      {copied ? 'Copied' : 'Copy SQL'}
    </button>
  )
}

export default function IssuesList({
  issues,
  canApply = false,
  onApply,
}: {
  issues: ScanIssue[]
  canApply?: boolean
  onApply?: (issue: ScanIssue) => Promise<void>
}) {
  const [applying, setApplying] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState<{ fp: string; msg: string } | null>(null)

  async function handleApply(issue: ScanIssue) {
    if (!onApply) return
    setApplying(issue.fingerprint)
    setErr(null)
    try {
      await onApply(issue)
      setDone(issue.fingerprint)
      setTimeout(() => setDone(null), 2500)
    } catch (e) {
      setErr({ fp: issue.fingerprint, msg: e instanceof Error ? e.message : 'Apply failed' })
    } finally {
      setApplying(null)
    }
  }

  if (!issues.length) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-emerald-700 font-semibold">No issues detected</p>
        <p className="text-slate-500 text-sm mt-1">This database looks healthy right now.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, i) => {
        const s = SEVERITY_STYLES[issue.severity]
        const canFix = canApply && issue.autofix && !!issue.sql && !!onApply
        return (
          <div key={issue.fingerprint ?? i} className={`rounded-xl border-l-4 ${s.border} ${s.bg} border border-slate-200 p-4`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.chip}`}>{s.label}</span>
              <span className="text-slate-900 font-semibold text-sm">{issue.title}</span>
              {issue.affected && <span className="text-xs text-slate-500 font-mono">{issue.affected}</span>}
            </div>
            <p className="text-slate-600 text-sm mt-2">{issue.description}</p>

            <div className="mt-3 rounded-lg bg-white border border-slate-200 p-3">
              <p className="text-xs text-[#2f6bff] font-semibold uppercase tracking-wide mb-1">How to counter it</p>
              <p className="text-slate-700 text-sm">{issue.recommendation}</p>
              {issue.sql && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">Suggested SQL</span>
                    <CopyButton text={issue.sql} />
                  </div>
                  <pre className="text-xs font-mono text-emerald-300 bg-slate-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{issue.sql}</pre>
                </div>
              )}

              {canFix && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => handleApply(issue)}
                    disabled={applying === issue.fingerprint}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#2f6bff] hover:bg-[#1f54e0] text-white transition disabled:opacity-50"
                  >
                    {applying === issue.fingerprint ? 'Applying…' : 'Apply fix'}
                  </button>
                  {done === issue.fingerprint && <span className="text-xs text-emerald-600">✓ Applied</span>}
                  {err?.fp === issue.fingerprint && <span className="text-xs text-red-600">{err.msg}</span>}
                </div>
              )}
              {!issue.autofix && issue.sql && (
                <p className="mt-2 text-[11px] text-slate-400">Needs review — fill in the placeholders before running.</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
