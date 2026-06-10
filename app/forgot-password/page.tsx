'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '../components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw new Error(resetError.message)
      setSent(true)
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
          <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="text-slate-500 text-sm mt-1">We&apos;ll email you a reset link</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700">
                  If an account exists for <strong>{email}</strong>, a reset link is on its way.
                  Open it to set a new password.
                </p>
              </div>
              <Link href="/login" className="inline-block font-semibold text-[#2f6bff] hover:text-[#1f54e0] text-sm">
                Back to sign in →
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full mt-6 bg-[#2f6bff] hover:bg-[#1f54e0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-slate-500 mt-4">
                <Link href="/login" className="font-semibold text-[#2f6bff] hover:text-[#1f54e0]">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
