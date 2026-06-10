'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useConnection } from './ConnectionContext'
import { createClient } from '@/lib/supabase/client'
import MonitorBar from './MonitorBar'
import { NavIcon, type IconName } from './NavIcons'
import { LogoMark } from './Logo'

const mainNavItems: Array<{ label: string; href: string; icon: IconName }> = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Connections', href: '/connections', icon: 'database' },
  { label: 'Live Feed', href: '/live-health', icon: 'activity' },
  { label: 'Query Diff', href: '/plan-diff', icon: 'diff' },
  { label: 'Concurrency', href: '/locks', icon: 'lock' },
  { label: 'Rules', href: '/autopilot', icon: 'bolt' },
  { label: 'Schema', href: '/schema', icon: 'schema' },
  { label: 'Backup', href: '/backup', icon: 'archive' },
  { label: 'OLAP Analytics', href: '/olap', icon: 'chart' },
  { label: 'JSON Explorer', href: '/json-explorer', icon: 'braces' },
  { label: 'Reports', href: '/report', icon: 'report' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { connections, selectedId, setSelectedId, role: userRole, userName } = useConnection()
  const roleLabel = userRole === 'admin' ? 'Admin' : userRole ? 'User' : 'Guest'

  const handleLogout = async () => {
    try {
      await createClient().auth.signOut()
    } catch { /* ignore */ }
    localStorage.removeItem('user_role')
    localStorage.removeItem('user')
    localStorage.removeItem('selected_connection')
    // Full reload so the persistent providers reset (clears the scan poller).
    window.location.assign('/login')
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          {/* Logo */}
          <div className="px-5 h-16 flex items-center border-b border-slate-100">
            <div className="flex items-center gap-3">
              <LogoMark size={36} className="shrink-0 rounded-[11px] shadow-sm" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">DB Autopilot</p>
                <p className="text-xs text-slate-400">SRE Center</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            {mainNavItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#eef3ff] text-[#1f54e0]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <NavIcon
                    name={item.icon}
                    className={active ? 'text-[#2f6bff]' : 'text-slate-400 group-hover:text-slate-500'}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-[#eef3ff] flex items-center justify-center text-[#2f6bff] font-semibold text-sm">
                {userName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-semibold text-slate-900 truncate">{userName || 'Account'}</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 w-full text-left px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active DB</label>
              {connections.length === 0 ? (
                <Link href="/connections" className="text-sm font-semibold text-[#2f6bff] hover:text-[#1f54e0]">
                  Connect a database →
                </Link>
              ) : (
                <select
                  value={selectedId ?? ''}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-[#2f6bff] focus:ring-2 focus:ring-[#2f6bff]/15 transition shadow-xs"
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.db_type === 'postgresql' ? 'PG' : 'MSSQL'} {c.status !== 'active' ? `(${c.status})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {roleLabel}
              </span>
              <div className="w-9 h-9 rounded-full bg-[#eef3ff] flex items-center justify-center text-[#2f6bff] font-semibold text-sm">
                {userName?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </header>

          {/* Always-on live monitoring strip */}
          <MonitorBar />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-8 py-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
