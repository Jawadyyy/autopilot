'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem('db-autopilot-token')) {
      router.replace('/dashboard')
    }
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data?.message || 'Login failed.')
        setLoading(false)
        return
      }

      window.localStorage.setItem('db-autopilot-token', data.token)
      window.localStorage.setItem('db-autopilot-user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err) {
      setError('Unable to connect to authentication service.')
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Login to DB Autopilot"
        description="Enter your credentials to access live monitoring, rule automation, and incident analytics."
      />
      <div className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-zinc-300">Username</label>
            <input
              className="w-full rounded-3xl border border-white/10 bg-[#0c0d11] px-4 py-3 text-white outline-none transition focus:border-[#ff6f3d]"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-zinc-300">Password</label>
            <input
              className="w-full rounded-3xl border border-white/10 bg-[#0c0d11] px-4 py-3 text-white outline-none transition focus:border-[#ff6f3d]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error ? <p className="text-sm text-[#ff6f3d]">{error}</p> : null}
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-3xl bg-gradient-to-r from-[#c92f41] via-[#ff6f3d] to-[#a11d33] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-[#ff6f3d]/20 transition hover:brightness-110"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-sm leading-6 text-zinc-500">
            Use an existing user from the backend or register directly through the API. Roles supported: <span className="text-white">db_viewer</span>, <span className="text-white">db_operator</span>, <span className="text-white">db_admin</span>.
          </p>
        </form>
      </div>
    </AppShell>
  )
}
