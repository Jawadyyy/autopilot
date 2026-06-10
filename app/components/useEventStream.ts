'use client'

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'

export type LiveEvent = { type: string; payload: any; timestamp: string }

// Live activity feed. Originally a server-sent-events stream backed by an
// in-memory hub — that can't work on serverless (Vercel) where instances are
// stateless and short-lived, and an in-memory hub also risked leaking events
// across users. Instead we poll the per-user-scoped /api/health-events endpoint,
// which the API already restricts to the caller's own databases.
const POLL_MS = 10000

export function useEventStream(max = 25) {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('user')) return

    let cancelled = false

    const poll = async () => {
      try {
        const rows: any[] = await apiFetch('/api/health-events')
        if (cancelled) return
        const mapped: LiveEvent[] = (rows || []).slice(0, max).map((r) => ({
          type: 'issue',
          payload: {
            issue_type: r.issue_type,
            severity:   r.severity,
            title:      r.title,
            affected:   r.affected_table,
            resolved:   r.is_resolved,
          },
          timestamp: r.timestamp || r.detected_at,
        }))
        setEvents(mapped)
        setConnected(true)
      } catch {
        if (!cancelled) setConnected(false)
      }
    }

    poll()
    timer.current = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      if (timer.current) clearInterval(timer.current)
    }
  }, [max])

  return { events, connected }
}

export function describeEvent(ev: LiveEvent): string {
  const p = ev.payload || {}
  switch (ev.type) {
    case 'issue':       return `${p.resolved ? '✓ ' : ''}${p.severity ? `[${p.severity}] ` : ''}${p.title}${p.affected ? ` (${p.affected})` : ''}`
    case 'autofix':     return `Autopilot fixed ${p.issue_type}${p.affected ? ` (${p.affected})` : ''} via rule "${p.rule}"`
    case 'fix_applied': return `${p.by ?? 'Operator'} applied a fix for ${p.issue_type}`
    case 'scan':        return `Scan found ${p.critical} critical issue(s)`
    default:            return ev.type
  }
}
