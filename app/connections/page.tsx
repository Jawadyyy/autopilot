'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import LiveMetrics from '../components/LiveMetrics'
import { useConnection, roleAtLeast } from '../components/ConnectionContext'
import { useToast } from '../components/Toast'
import { apiFetch } from '@/lib/api'

type Connection = {
  id: string
  name: string
  host: string
  port: number
  db_name: string
  username: string
  db_type: 'postgresql' | 'mssql'
  status: 'active' | 'paused' | 'error'
  last_checked_at: string | null
  last_error: string | null
}

const EMPTY_FORM = {
  name: '',
  db_type: 'postgresql' as 'postgresql' | 'mssql',
  host: '',
  port: 5432,
  db_name: '',
  username: '',
  password: '',
}

export default function ConnectionsPage() {
  const { role, refresh: refreshContext, setSelectedId } = useConnection()
  const { notify } = useToast()
  const canManage = roleAtLeast(role, 'db_operator')
  const canDelete = roleAtLeast(role, 'db_admin')
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function loadConnections() {
    try {
      const data = await apiFetch('/api/connections')
      setConnections(data || [])
    } catch (err) {
      console.error('Failed to load connections', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConnections() }, [])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setTestResult(null)
  }

  function openForm() {
    setForm(EMPTY_FORM)
    setTestResult(null)
    setFormError('')
    setShowForm(true)
  }

  const payload = () => ({
    name: form.name,
    db_type: form.db_type,
    host: form.host,
    port: Number(form.port),
    db_name: form.db_name,
    username: form.username,
    password: form.password,
  })

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    setFormError('')
    try {
      const result = await apiFetch('/api/connections?action=test', {
        method: 'POST',
        body: JSON.stringify(payload()),
      })
      setTestResult(result)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setFormError('')
    try {
      const created = await apiFetch('/api/connections', {
        method: 'POST',
        body: JSON.stringify(payload()),
      })
      setShowForm(false)
      await loadConnections()
      await refreshContext()
      if (created?.id) setSelectedId(created.id) // make the new DB the active one
      notify(`Connected “${form.name}” and set as active.`, 'success')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save connection')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(conn: Connection) {
    setBusyId(conn.id)
    try {
      const next = conn.status === 'active' ? 'paused' : 'active'
      await apiFetch(`/api/connections?id=${conn.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      await loadConnections()
      await refreshContext()
      notify(`${conn.name} ${conn.status === 'active' ? 'paused' : 'resumed'}.`, 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update status', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(conn: Connection) {
    if (!confirm(`Remove connection "${conn.name}"? This stops monitoring it.`)) return
    setBusyId(conn.id)
    try {
      await apiFetch(`/api/connections?id=${conn.id}`, { method: 'DELETE' })
      if (expanded === conn.id) setExpanded(null)
      await loadConnections()
      await refreshContext()
      notify(`Removed ${conn.name}.`, 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to remove connection', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const statusPill = (status: string) =>
    status === 'active' ? 'bg-emerald-100 text-emerald-700' :
    status === 'paused' ? 'bg-slate-100 text-slate-600' :
    'bg-red-100 text-red-700'

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Connection Manager</h1>
            <p className="text-slate-500 mt-2">Register external PostgreSQL / MSSQL databases and watch them live.</p>
          </div>
          <button
            onClick={openForm}
            disabled={!canManage}
            title={canManage ? '' : 'Requires db_operator or db_admin role'}
            className="bg-[#2f6bff] hover:bg-[#1f54e0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg transition shadow-sm"
          >
            + Connect New Database
          </button>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading connections...</div>
        ) : connections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-slate-700 font-medium">No databases connected yet</p>
            <p className="text-slate-400 text-sm mt-1">Click “Connect New Database” to register your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-900 font-semibold">{conn.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusPill(conn.status)}`}>
                        {conn.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {conn.db_type === 'postgresql' ? 'PostgreSQL' : 'MSSQL'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1 font-mono">
                      {conn.username}@{conn.host}:{conn.port}/{conn.db_name}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Last checked: {conn.last_checked_at ? new Date(conn.last_checked_at).toLocaleString() : 'never'}
                      {conn.last_error && <span className="text-red-600"> · {conn.last_error}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(expanded === conn.id ? null : conn.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#eef3ff] text-[#1f54e0] hover:bg-[#dde8ff] transition"
                    >
                      {expanded === conn.id ? 'Hide metrics' : 'Live metrics'}
                    </button>
                    {canManage && (
                      <button
                        onClick={() => toggleStatus(conn)}
                        disabled={busyId === conn.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
                      >
                        {conn.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => remove(conn)}
                        disabled={busyId === conn.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {expanded === conn.id && (
                  <LiveMetrics connectionId={conn.id} dbType={conn.db_type} name={conn.name} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Connection Health</h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Active</span>
            <span className="text-emerald-600 font-semibold">
              {connections.filter((c) => c.status === 'active').length} / {connections.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${connections.length ? (connections.filter((c) => c.status === 'active').length / connections.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Connect new database modal ───────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Connect New Database</h2>
            <p className="text-slate-500 text-sm mb-5">The target database needs no changes — we only read its system catalogs.</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" className="col-span-2">
                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="prod-customer-db" className={inputCls} />
              </Field>

              <Field label="Type">
                <select
                  value={form.db_type}
                  onChange={(e) => {
                    const t = e.target.value as 'postgresql' | 'mssql'
                    update('db_type', t)
                    update('port', t === 'postgresql' ? 5432 : 1433)
                  }}
                  className={inputCls}
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mssql">MSSQL</option>
                </select>
              </Field>
              <Field label="Port">
                <input type="number" value={form.port} onChange={(e) => update('port', Number(e.target.value))} className={inputCls} />
              </Field>

              <Field label="Host" className="col-span-2">
                <input value={form.host} onChange={(e) => update('host', e.target.value)} placeholder="db.xxxx.supabase.co" className={inputCls} />
              </Field>

              <Field label="Database name">
                <input value={form.db_name} onChange={(e) => update('db_name', e.target.value)} placeholder="postgres" className={inputCls} />
              </Field>
              <Field label="Username">
                <input value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="postgres" className={inputCls} />
              </Field>

              <Field label="Password" className="col-span-2">
                <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="••••••••" className={inputCls} />
              </Field>
            </div>

            {testResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm border ${
                testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {testResult.success
                  ? `✓ Connected in ${testResult.latencyMs}ms`
                  : `✗ ${testResult.error || 'Connection failed'}`}
              </div>
            )}

            <div className="flex justify-between gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2">
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing || !form.host || !form.db_name || !form.username || !form.password}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.host || !form.db_name || !form.username || !form.password}
                  className="text-sm font-semibold px-5 py-2 rounded-lg bg-[#2f6bff] hover:bg-[#1f54e0] text-white transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save & Monitor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

const inputCls = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition'

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
