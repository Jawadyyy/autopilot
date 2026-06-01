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
  critical: { border: 'border-red-500',    bg: 'bg-red-500/10',    text: 'text-red-400',    chip: 'bg-red-500/20 text-red-300',       label: 'Critical' },
  high:     { border: 'border-orange-500',  bg: 'bg-orange-500/10', text: 'text-orange-400', chip: 'bg-orange-500/20 text-orange-300', label: 'High' },
  warning:  { border: 'border-yellow-500',  bg: 'bg-yellow-500/10', text: 'text-yellow-300', chip: 'bg-yellow-500/20 text-yellow-300', label: 'Warning' },
  info:     { border: 'border-blue-500',    bg: 'bg-blue-500/10',   text: 'text-blue-300',   chip: 'bg-blue-500/20 text-blue-300',     label: 'Info' },
}

export function healthTone(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-yellow-300'
  return 'text-red-400'
}
