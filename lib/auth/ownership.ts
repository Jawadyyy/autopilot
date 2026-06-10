import { query, queryOne } from '@/lib/db/pool'
import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'user'

export interface AuthUser {
  userId: string
  email:  string | null
  role:   Role
}

function isAdminEmail(email: string | null): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return email.trim().toLowerCase() === admin.trim().toLowerCase()
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

// Resolve (and keep in sync) the caller's app role. ADMIN_EMAIL is the single
// source of truth for who is the admin, so we re-derive it on every call and
// upsert the profile row — this also lazily provisions a profile the first time
// a Supabase-authenticated user hits the app.
async function resolveRole(id: string, email: string | null): Promise<Role> {
  const role: Role = isAdminEmail(email) ? 'admin' : 'user'
  await query(
    `INSERT INTO profiles (id, email, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role`,
    [id, email, role]
  ).catch(() => { /* profiles table created by ensureSchema; ignore transient errors */ })
  return role
}

// Returns the authenticated user (from the Supabase session cookie) plus their
// app role, or null if no valid session.
// Note: `_req` is accepted but ignored. Legacy call sites pass the NextRequest;
// the Supabase server client reads cookies via next/headers instead.
export async function getAuthUser(_req?: unknown): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const email = user.email ?? null
  const role  = await resolveRole(user.id, email)
  return { userId: user.id, email, role }
}

// Fetch a single connection the caller is allowed to see. Admins may access any
// connection; normal users only their own (added_by). Returns null when the
// connection doesn't exist OR isn't owned by the caller — treat both as 404 so
// we never reveal the existence of another user's database.
export async function requireConnection<T = any>(
  user: AuthUser,
  connectionId: string | null | undefined,
  columns = '*'
): Promise<T | null> {
  if (!connectionId) return null
  if (user.role === 'admin') {
    return queryOne<T>(
      `SELECT ${columns} FROM monitored_connections WHERE id = $1`,
      [connectionId]
    )
  }
  return queryOne<T>(
    `SELECT ${columns} FROM monitored_connections WHERE id = $1 AND added_by = $2`,
    [connectionId, user.userId]
  )
}

// The connection ids the caller may see. `null` means "no restriction" (admin).
// An empty array means the user has connected nothing yet → sees nothing.
// Use with:  WHERE connection_id = ANY($n)   (only when the result is non-null)
export async function ownedConnectionIds(user: AuthUser): Promise<string[] | null> {
  if (user.role === 'admin') return null
  const rows = await query<{ id: string }>(
    `SELECT id FROM monitored_connections WHERE added_by = $1`,
    [user.userId]
  )
  return rows.map((r) => r.id)
}
