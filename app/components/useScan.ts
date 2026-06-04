// Shared scan types + presentation helpers. Live polling now lives in
// ConnectionContext (one shared poller), so this file only holds types/styles.

export type Severity = 'critical' | 'high' | 'warning' | 'info'

export interface ScanIssue {
  issue_type: string
  severity: Severity
  title: string
  description: string
  affected?: string
  recommendation: string
  sql?: string
  fingerprint: string
  autofix: boolean
  safeAuto: boolean
}

export interface ScanResult {
  connectionId: string
  scannedAt: string
  healthScore: number
  metrics: {
    active_connections: number | null
    idle_connections: number | null
    idle_in_tx: number | null
    cache_hit_ratio: number | null
    avg_query_ms: number | null
    slow_query_count: number | null
  }
  issues: ScanIssue[]
}

export const SEVERITY_STYLES: Record<Severity, { border: string; bg: string; text: string; chip: string; label: string }> = {
  critical: { border: 'border-red-500',    bg: 'bg-red-50',    text: 'text-red-600',    chip: 'bg-red-100 text-red-700',       label: 'Critical' },
  high:     { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', chip: 'bg-orange-100 text-orange-700', label: 'High' },
  warning:  { border: 'border-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  chip: 'bg-amber-100 text-amber-800',   label: 'Warning' },
  info:     { border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-600',   chip: 'bg-blue-100 text-blue-700',     label: 'Info' },
}

export function healthTone(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}
