'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Connections', href: '/connections' },
  { label: 'Live Health', href: '/live-health' },
  { label: 'Query Plan Diff', href: '/plan-diff' },
  { label: 'Locks', href: '/locks' },
  { label: 'Autopilot Rules', href: '/autopilot' },
  { label: 'Schema Browser', href: '/schema' },
  { label: 'Backup', href: '/backup' },
  { label: 'OLAP Analytics', href: '/olap' },
  { label: 'JSON Explorer', href: '/json-explorer' },
  { label: 'Performance Report', href: '/report' },
  { label: 'Login', href: '/login' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    setAuthToken(window.localStorage.getItem('db-autopilot-token'))

    const splashSeen = window.sessionStorage.getItem('db-autopilot-splash-shown')
    if (!splashSeen) {
      window.sessionStorage.setItem('db-autopilot-splash-shown', 'true')
      setShowSplash(true)
      const timer = window.setTimeout(() => setShowSplash(false), 1300)
      return () => window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#030814] text-white">
      {showSplash ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#20070b]/95 px-4 py-6 text-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#2b090f]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4c0914] ring-2 ring-[#dc2626]/30">
                <div className="h-10 w-10 rounded-full bg-[#dc2626] animate-pulse" />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[#fca5a5]">DB Autopilot</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Starting application</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Loading your database monitoring workspace and connecting to live data.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#0a2b5b] to-transparent opacity-80" />
        <div className="relative mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[#071a30]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.25)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-3xl bg-[#4c0914] text-lg font-semibold text-[#fecaca] shadow-[0_12px_30px_rgba(220,38,38,0.18)]">
                <span className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#dc2626] to-[#fca5a5]/30 opacity-25" />
                <span className="relative">DB</span>
                <span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 rounded-full bg-[#fb7185] after:absolute after:inset-0 after:rounded-full after:animate-ping after:bg-[#fb7185]/40" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-[#fecaca]">DB Autopilot</p>
                <p className="text-sm font-semibold text-white/90">Realtime database ops</p>
              </div>
            </div>
            <div className="hidden items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400 sm:flex">
              <span className="rounded-full bg-[#7f1d1d]/10 px-3 py-1 text-[#fecaca]">Crimson UI</span>
              <span className="rounded-full bg-[#fca5a5]/10 px-3 py-1 text-[#f87171]">Live ops</span>
            </div>
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-6 rounded-[2rem] border border-white/10 bg-[#081b34]/95 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
                <div className="rounded-[1.75rem] bg-[#33060c]/90 p-4">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#fecaca]">Workspace</p>
                  <p className="mt-2 text-sm font-semibold text-white">Monitoring center</p>
                </div>
                <nav className="flex flex-col gap-1.5">
                  {navItems.map((item) => {
                    const active = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-3xl px-4 py-2.5 text-[13px] font-medium transition ${
                          active
                            ? 'bg-[#7f1d1d] text-white shadow-[0_8px_24px_rgba(220,38,38,0.14)]'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>

                <div className="rounded-[1.75rem] border border-white/10 bg-[#081a37]/95 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Session</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Use this sidebar to move between dashboards, live health, and managed database controls.
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[#fecaca]">
                    {authToken ? 'Authenticated' : 'Guest mode'}
                  </p>
                </div>
              </div>
            </aside>

            <main className="flex min-w-0 min-h-[calc(100vh-150px)] flex-col gap-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
