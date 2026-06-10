'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '../components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  // The recovery link drops the user here with a session in the URL; the
  // browser client picks it up and fires PASSWORD_RECOVERY. We also check for an
  // existing session in case it's already been exchanged.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    if (!password) { setError('Please enter a new password'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)
      setDone(true)
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
          <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
          {done ? (
            <div className="text-center space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700">Password updated. You can sign in now.</p>
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
              {!ready && !error && (
                <p className="mb-4 text-sm text-slate-500">
                  Open this page from the reset link in your email. Waiting for the recovery session…
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
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
                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
                  />
                </div>
              </div>

              <button
                onClick={handleReset}
                disabled={loading || !ready}
                className="w-full mt-6 bg-[#2f6bff] hover:bg-[#1f54e0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
