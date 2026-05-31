'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'credentials'>('role')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setStep('credentials')
  }

  const handleLogin = async () => {
    if (!identifier || !token || !selectedRole) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          token,
          role: selectedRole
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Authentication failed')
      }

      const data = await response.json()
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_role', selectedRole)
      
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050507] to-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-[#2f75ff] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">DA</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">DB Autopilot</h1>
          <p className="text-slate-300">SRE Command Center</p>
        </div>

        {step === 'role' ? (
          // Role Selection Step
          <div className="bg-[#081f3f]/95 border border-white/10 rounded-[2rem] p-12 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
            <h2 className="text-xl font-semibold text-white mb-2">Select Access Role Hierarchy</h2>
            <p className="text-slate-400 text-sm mb-8">Choose your role to continue</p>

            <div className="grid gap-4">
              {/* DB Viewer */}
              <button
                onClick={() => handleRoleSelect('db_viewer')}
                className="p-6 rounded-[1.5rem] border-2 border-white/10 bg-[#0c2140]/50 hover:border-[#2f75ff] hover:bg-[#2f75ff]/10 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#2f75ff]/20 transition">
                    <span className="text-lg">V</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">DB Viewer</h3>
                    <p className="text-sm text-slate-400">Read-only access to dashboards and reports</p>
                  </div>
                </div>
              </button>

              {/* DB Operator */}
              <button
                onClick={() => handleRoleSelect('db_operator')}
                className="p-6 rounded-[1.5rem] border-2 border-white/10 bg-[#0c2140]/50 hover:border-[#2f75ff] hover:bg-[#2f75ff]/10 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#2f75ff]/20 transition">
                    <span className="text-lg">O</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">DB Operator</h3>
                    <p className="text-sm text-slate-400">Execute operations and manage automations</p>
                  </div>
                </div>
              </button>

              {/* DB Admin */}
              <button
                onClick={() => handleRoleSelect('db_admin')}
                className="p-6 rounded-[1.5rem] border-2 border-[#2f75ff]/30 bg-[#2f75ff]/5 hover:border-[#2f75ff] hover:bg-[#2f75ff]/10 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#2f75ff]/20 flex items-center justify-center group-hover:bg-[#2f75ff]/30 transition">
                    <span className="text-lg">A</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">DB Admin</h3>
                    <p className="text-sm text-slate-300">Full control over all systems</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 p-4 bg-[#0a1628]/50 border border-[#7faaff]/20 rounded-lg">
              <p className="text-xs text-[#7faaff] leading-relaxed">
                <strong>Security Protocol Note:</strong> DB Autopilot strictly enforces Row-Level Security (RLS) and native PostgreSQL RBAC. Your selected role dictates data-reduction policies and VPC routing. All administrative actions are logged in the immutable audit trail.
              </p>
            </div>
          </div>
        ) : (
          // Credentials Step
          <div className="bg-[#081f3f]/95 border border-white/10 rounded-[2rem] p-12 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
            <button
              onClick={() => {
                setStep('role')
                setSelectedRole(null)
                setIdentifier('')
                setToken('')
                setError('')
              }}
              className="mb-6 text-sm text-slate-400 hover:text-[#2f75ff] transition"
            >
              ← Back to role selection
            </button>

            <h2 className="text-xl font-semibold text-white mb-2">Authenticate as {selectedRole}</h2>
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
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
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
        )}
      </div>
    </div>
  )
}
