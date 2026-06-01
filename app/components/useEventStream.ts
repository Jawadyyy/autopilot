'use client'

import { useEffect, useState } from 'react'

export type LiveEvent = { type: string; payload: any; timestamp: string }

// Subscribes to the server's SSE feed (/api/ws). Auth rides on the httpOnly
// cookie, which EventSource sends automatically on same-origin requests.
export function useEventStream(max = 25) {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('user')) return

    const es = new EventSource('/api/ws')
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const ev: LiveEvent = JSON.parse(e.data)
        if (ev.type === 'connected') return
        setEvents((prev) => [ev, ...prev].slice(0, max))
      } catch { /* ignore */ }
    }
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [max])

  return { events, connected }
}

export function describeEvent(ev: LiveEvent): string {
  const p = ev.payload || {}
  switch (ev.type) {
    case 'autofix':     return `Autopilot fixed ${p.issue_type}${p.affected ? ` (${p.affected})` : ''} via rule "${p.rule}"`
    case 'fix_applied': return `${p.by ?? 'Operator'} applied a fix for ${p.issue_type}`
    case 'scan':        return `Scan found ${p.critical} critical issue(s)`
    default:            return ev.type
  }
}
