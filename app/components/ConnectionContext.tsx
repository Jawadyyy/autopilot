'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'
import type { ScanIssue, ScanResult } from './useScan'

export type Conn = {
  id: string
  name: string
  host: string
  port: number
  db_name: string
  username: string
  db_type: 'postgresql' | 'mssql'
  status: 'active' | 'paused' | 'error'
  last_checked_at: string | null
  last_error: string | null
}

export type Role = 'db_viewer' | 'db_operator' | 'db_admin' | null

type ScanState = ScanResult & { autoApplied?: { issue_type: string; affected?: string; sql: string }[] }

type Ctx = {
  connections: Conn[]
  selectedId: string | null
  selected: Conn | null
  setSelectedId: (id: string) => void
  role: Role
  userName: string | null
  loading: boolean
  refresh: () => Promise<void>
  // Live scan (centralized — one poller shared by every page)
  scan: ScanState | null
  scanLoading: boolean
  scanError: string
  scanLive: boolean
  setScanLive: (v: boolean) => void
  rescan: () => Promise<void>
  applyFix: (issue: ScanIssue) => Promise<void>
}

const ConnectionContext = createContext<Ctx | null>(null)
const STORAGE_KEY = 'selected_connection'
const SCAN_INTERVAL = 15000

const ROLE_LEVELS: Record<string, number> = { db_viewer: 1, db_operator: 2, db_admin: 3 }
export function roleAtLeast(role: Role, required: Exclude<Role, null>): boolean {
  if (!role) return false
  return (ROLE_LEVELS[role] ?? 0) >= ROLE_LEVELS[required]
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<Conn[]>([])
  const [selectedId, setSelectedIdState] = useState<string | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [scan, setScan] = useState<ScanState | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanLive, setScanLive] = useState(true)
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('user')) { setLoading(false); return }
    try {
      const data: Conn[] = await apiFetch('/api/connections')
      const list = data || []
      setConnections(list)
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && list.some((c) => c.id === stored)) setSelectedIdState(stored)
      else if (list.length) setSelectedId(list[0].id)
      else setSelectedIdState(null)
    } catch {
      /* not logged in / no data */
    } finally {
      setLoading(false)
    }
  }, [setSelectedId])

  useEffect(() => {
    setRole(localStorage.getItem('user_role') as Role)
    try {
      const u = localStorage.getItem('user')
      setUserName(u ? JSON.parse(u).username : null)
    } catch { setUserName(null) }
    refresh()
  }, [refresh])

  const selected = connections.find((c) => c.id === selectedId) ?? null

  // ── Centralized live scan: one poller drives every page ──────────────────
  const runScan = useCallback(async (id: string) => {
    try {
      const res: ScanState = await apiFetch('/api/monitor?action=scan', {
        method: 'POST',
        body: JSON.stringify({ connectionId: id }),
      })
      setScan(res)
      setScanError('')
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanLoading(false)
    }
  }, [])

  useEffect(() => {
    if (scanTimer.current) clearInterval(scanTimer.current)
    setScan(null)
    setScanError('')
    if (!selectedId) { setScanLoading(false); return }

    setScanLoading(true)
    runScan(selectedId)
    if (scanLive) scanTimer.current = setInterval(() => runScan(selectedId), SCAN_INTERVAL)

    return () => { if (scanTimer.current) clearInterval(scanTimer.current) }
  }, [selectedId, scanLive, runScan])

  const rescan = useCallback(async () => {
    if (selectedId) { setScanLoading(true); await runScan(selectedId) }
  }, [selectedId, runScan])

  const applyFix = useCallback(async (issue: ScanIssue) => {
    if (!selectedId) return
    await apiFetch('/api/monitor?action=apply_fix', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: selectedId,
        sql: issue.sql,
        issue_type: issue.issue_type,
        fingerprint: issue.fingerprint,
        title: issue.title,
      }),
    })
    await rescan()
  }, [selectedId, rescan])

  return (
    <ConnectionContext.Provider
      value={{
        connections, selectedId, selected, setSelectedId, role, userName, loading, refresh,
        scan, scanLoading, scanError, scanLive, setScanLive, rescan, applyFix,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection(): Ctx {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider')
  return ctx
}
