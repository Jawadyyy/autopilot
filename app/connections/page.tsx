'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

type DbType = 'postgresql' | 'mssql'

type Connection = {
  id: string
  name: string
  host: string
  port: number
  db_name: string
  username: string
  db_type: DbType
  status: string
  last_checked_at: string | null
  last_error: string | null
  created_at: string
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '5432',
    db_name: '',
    username: '',
    password: '',
    db_type: 'postgresql' as DbType,
  })
  const [feedback, setFeedback] = useState<string | null>(null)

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('db-autopilot-token') : null

  useEffect(() => {
    fetchConnections()
  }, [])

  async function fetchConnections() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/connections', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.message || 'Unable to load connections')
      }
      setConnections(json.data ?? json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    setError(null)
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name,
          host: form.host,
          port: Number(form.port),
          db_name: form.db_name,
          username: form.username,
          password: form.password,
          db_type: form.db_type,
        }),
      })
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.message || 'Unable to register connection')
      }
      setFeedback('Connection registered successfully.')
      setForm({ ...form, password: '' })
      fetchConnections()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleAction(id: string, action: 'pause' | 'activate' | 'remove') {
    setFeedback(null)
    setError(null)
    try {
      if (action === 'remove') {
        const response = await fetch(`/api/connections?id=${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const json = await response.json()
        if (!response.ok) throw new Error(json?.message || 'Remove failed')
        setFeedback('Connection removed.')
      } else {
        const response = await fetch(`/api/connections?id=${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: action === 'pause' ? 'paused' : 'active' }),
        })
        const json = await response.json()
        if (!response.ok) throw new Error(json?.message || 'Status update failed')
        setFeedback('Connection status updated.')
      }
      fetchConnections()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <AppShell>
      <PageHeader
        title="Connection Manager"
        description="Register, test, pause, and remove external PostgreSQL and MSSQL databases from the monitoring pool."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[#111d33]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Registered databases</h2>
              <p className="mt-2 text-sm text-zinc-300">View current connections, status, and action controls.</p>
            </div>
            <span className="rounded-full bg-[#2f75ff]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#76b7ff]">Manage</span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-[#0d1a32]/95 p-8 text-center text-sm text-zinc-400">Loading connections…</div>
          ) : error ? (
            <div className="rounded-3xl border border-[#ff4b5c]/20 bg-[#2c151f]/95 p-6 text-sm text-[#ff8c9a]">{error}</div>
          ) : connections.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#0d1a32]/95 p-8 text-center text-sm text-zinc-400">No connections registered yet.</div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <div key={conn.id} className="rounded-3xl border border-white/10 bg-[#0b1630]/95 p-5 shadow-sm shadow-black/20">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.22em] text-blue-300">{conn.db_type.toUpperCase()}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{conn.name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{conn.host}:{conn.port} · {conn.db_name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`rounded-full px-3 py-1 ${
                        conn.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : conn.status === 'paused'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-red-500/10 text-red-300'
                      }`}>{conn.status}</span>
                      <span className="text-zinc-400">Checked: {conn.last_checked_at ?? 'N/A'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <button
                      className="rounded-3xl bg-[#2f75ff]/10 px-4 py-2 text-[#bbd7ff] transition hover:bg-[#2f75ff]/20"
                      onClick={() => handleAction(conn.id, conn.status === 'paused' ? 'activate' : 'pause')}
                    >
                      {conn.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      className="rounded-3xl bg-[#c92f41]/10 px-4 py-2 text-[#ffb3b8] transition hover:bg-[#c92f41]/20"
                      onClick={() => handleAction(conn.id, 'remove')}
                    >
                      Remove
                    </button>
                    {conn.last_error ? <span className="text-sm text-[#ff8c9a]">Error: {conn.last_error}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#111d33]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div>
            <h2 className="text-lg font-semibold text-white">Register new connection</h2>
            <p className="mt-2 text-sm text-zinc-300">Add an external PostgreSQL or MSSQL database for monitoring.</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleRegister}>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
                Connection name
                <input
                  className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
                Host
                <input
                  className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                  value={form.host}
                  onChange={(event) => updateField('host', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
                Port
                <input
                  className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                  value={form.port}
                  onChange={(event) => updateField('port', event.target.value)}
                  type="number"
                  required
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
                Database name
                <input
                  className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                  value={form.db_name}
                  onChange={(event) => updateField('db_name', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
                Username
                <input
                  className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  required
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
                Password
                <input
                  className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="grid min-w-0 gap-2 text-sm text-zinc-300">
              Database type
              <select
                className="w-full rounded-3xl border border-white/10 bg-[#0b1630] px-4 py-3 text-white outline-none transition focus:border-[#2f75ff]"
                value={form.db_type}
                onChange={(event) => updateField('db_type', event.target.value)}
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mssql">MSSQL</option>
              </select>
            </label>

            {error ? <p className="text-sm text-[#ff8c9a]">{error}</p> : null}
            {feedback ? <p className="text-sm text-[#76b7ff]">{feedback}</p> : null}

            <button className="inline-flex h-12 items-center justify-center rounded-3xl bg-[#2f75ff] px-6 text-sm font-semibold text-white transition hover:bg-[#4f9dff]/90">
              Register connection
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  )
}
