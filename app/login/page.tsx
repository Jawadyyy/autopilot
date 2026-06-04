'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '../components/Logo'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier,
          password: password,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const base = data.error || data.message || 'Authentication failed'
        const stack = data?.details?.stack
        throw new Error(stack ? `${base}\n${stack}` : base)
      }

      // The JWT is set as an httpOnly cookie by the server; we only keep
      // non-secret profile info client-side for UI (role gating, name).
      localStorage.setItem('user_role', data.data.user.role)
      localStorage.setItem('user', JSON.stringify(data.data.user))

      const next = new URLSearchParams(window.location.search).get('next')
      // Full-page navigation (not router.push) so the root-layout providers
      // remount and read the freshly-stored session (role, user) + cookie.
      window.location.assign(next && next.startsWith('/') ? next : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoMark size={52} className="rounded-2xl shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to the DB Autopilot SRE Center</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                placeholder="your-sre-id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-6 bg-[#2f6bff] hover:bg-[#1f54e0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <Link
            href="/"
            className="group mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            Back to home
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} DB Autopilot · PostgreSQL &amp; MSSQL
        </p>
      </div>
    </div>
  )
}