'use client'

import { useState } from 'react'

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
    <div className="min-h-screen bg-gradient-to-b from-[#050507] to-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-[#2f75ff] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">DA</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">DB Autopilot</h1>
          <p className="text-slate-300">SRE Command Center</p>
        </div>

        <div className="bg-[#081f3f]/95 border border-white/10 rounded-[2rem] p-12 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
          <h2 className="text-xl font-semibold text-white mb-2">Authenticate</h2>
          <p className="text-slate-400 text-sm mb-8">Enter your credentials to continue</p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">
                  SRE Username
                </label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0a1628]/50 border border-white/10 focus-within:border-[#2f75ff]/50 transition">
                  <span className="text-slate-500">U</span>
                  <input
                    type="text"
                    placeholder="your-sre-id"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">
                  Encrypted Token
                </label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0a1628]/50 border border-white/10 focus-within:border-[#2f75ff]/50 transition">
                  <span className="text-slate-500">P</span>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-6 bg-[#2f75ff] hover:bg-[#4b8cff] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-[1rem] transition shadow-lg shadow-[#2f75ff]/20"
          >
            {loading ? 'Authenticating...' : 'Initiate Session'}
          </button>
        </div>
      </div>
    </div>
  )
}