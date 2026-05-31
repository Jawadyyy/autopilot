'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const mainNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '' },
  { label: 'Connections', href: '/connections', icon: '' },
  { label: 'Live Feed', href: '/live-health', icon: '' },
  { label: 'Query Diff', href: '/plan-diff', icon: '' },
  { label: 'Concurrency', href: '/locks', icon: '' },
  { label: 'Rules', href: '/autopilot', icon: '' },
  { label: 'Schema', href: '/schema', icon: '' },
  { label: 'Backup', href: '/backup', icon: '' },
  { label: 'OLAP Analytics', href: '/olap', icon: '' },
  { label: 'JSON Explorer', href: '/json-explorer', icon: '' },
  { label: 'Reports', href: '/report', icon: '' },
]

const systemNavItems = [
  { label: 'Settings', href: '/settings', icon: '' },
  { label: 'Support', href: '/support', icon: '' },
]

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const role = localStorage.getItem('user_role')
    const name = localStorage.getItem('user_name')
    setUserRole(role)
    setUserName(name)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-80 bg-[#0a0f1a] border-r border-white/10 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#2f75ff] rounded-lg flex items-center justify-center text-sm font-bold text-white">
                DA
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7faaff]">DB Autopilot</p>
                <p className="text-xs text-slate-400">SRE Center</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {mainNavItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                    active
                      ? 'bg-[#2f75ff]/20 text-[#2f75ff] border border-[#2f75ff]/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* System Navigation */}
          <div className="border-t border-white/10 p-3 space-y-1">
            {systemNavItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                    active
                      ? 'bg-[#2f75ff]/20 text-[#2f75ff] border border-[#2f75ff]/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Info */}
          <div className="border-t border-white/10 p-4 space-y-3">
            <div className="text-xs">
              <p className="text-slate-400 uppercase tracking-widest">Role</p>
              <p className="text-white font-semibold capitalize mt-1">
                {userRole?.replace('_', ' ') || 'Guest'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded transition"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b border-white/10 bg-[#0a0f1a]/50 px-8 py-4 flex items-center justify-between">
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Connected</p>
                <p className="text-sm font-semibold text-green-400">System Online</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#2f75ff]/20 flex items-center justify-center text-[#2f75ff] font-semibold">
                {userName?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
