'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '../components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const handleSignup = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (signUpError) throw new Error(signUpError.message)

      // If email confirmation is enabled in Supabase, there's no active session
      // yet — tell the user to verify. Otherwise we're logged in immediately.
      if (data.session) {
        localStorage.setItem('user', JSON.stringify({ email: data.user?.email }))
        window.location.assign('/dashboard')
      } else {
        setNeedsConfirm(true)
      }
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
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Start monitoring your databases</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
          {needsConfirm ? (
            <div className="text-center space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700">
                  Check your email — we sent a confirmation link to <strong>{email}</strong>.
                  Confirm it, then sign in.
                </p>
              </div>
              <Link href="/login" className="inline-block font-semibold text-[#2f6bff] hover:text-[#1f54e0] text-sm">
                Go to sign in →
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    placeholder="re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
                  />
                </div>
              </div>

              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full mt-6 bg-[#2f6bff] hover:bg-[#1f54e0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
              >
                {loading ? 'Creating account…' : 'Sign up'}
              </button>

              <p className="text-center text-sm text-slate-500 mt-4">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[#2f6bff] hover:text-[#1f54e0]">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} DB Autopilot · PostgreSQL &amp; MSSQL
        </p>
      </div>
    </div>
  )
}
