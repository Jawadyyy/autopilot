'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

interface WsEvent {
  type: string
  timestamp: string
  payload: Record<string, any>
}

const initialMockEvents: WsEvent[] = [
  {
    type: 'High latency detected',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    payload: { source: 'Orders DB', latency: '470ms', threshold: '320ms' },
  },
  {
    type: 'Deadlock warning',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    payload: { source: 'Inventory MS', session: '59', query: 'UPDATE stock' },
  },
  {
    type: 'Backup window ready',
    timestamp: new Date(Date.now() - 540000).toISOString(),
    payload: { source: 'Analytics', nextRun: '02:00 UTC' },
  },
]

export default function LiveHealthPage() {
  const [events, setEvents] = useState<WsEvent[]>(initialMockEvents)
  const [status, setStatus] = useState('Connecting...')

  useEffect(() => {
    const token = window.localStorage.getItem('db-autopilot-token')
    if (!token) {
      setStatus('Login required to open live feed.')
      return
    }

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws?token=${token}`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => setStatus('Connected')
    socket.onclose = () => setStatus('Disconnected')
    socket.onerror = () => setStatus('Connection error')
    socket.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data)
        setEvents((current) => [{ type: parsed.type, timestamp: parsed.timestamp, payload: parsed.payload }, ...current].slice(0, 20))
      } catch {
        // ignore invalid messages
      }
    }

    return () => socket.close()
  }, [])

  const statusClass =
    status === 'Connected'
      ? 'bg-emerald-500/10 text-emerald-200'
      : status === 'Disconnected'
      ? 'bg-red-500/10 text-red-200'
      : status === 'Connection error'
      ? 'bg-amber-500/10 text-amber-200'
      : 'bg-slate-700/10 text-slate-300'

  return (
    <AppShell>
      <PageHeader
        title="Live Health Feed"
        description="Watch detected issues flow in real time with severity highlights, database context, and one-click action prompts."
      />

      <div className="grid gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">WebSocket status</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-[0.24em] ${statusClass}`}>
              {status}
            </span>
            <span className="text-sm text-slate-400">Showing the latest {events.length} events</span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#15171d]/95 p-6">
          <div className="grid gap-4">
            {events.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#0c0d11]/80 p-8 text-center text-sm text-zinc-400">
                Waiting for live events from connected databases.
              </div>
            ) : (
              events.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="rounded-3xl border border-white/10 bg-[#0f1115]/90 p-5 shadow-sm shadow-black/20">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{event.type}</span>
                    <span className="text-xs text-zinc-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className="mt-4 max-h-40 overflow-auto rounded-3xl bg-[#0b0c10] p-4 text-xs text-zinc-300">{JSON.stringify(event.payload, null, 2)}</pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
