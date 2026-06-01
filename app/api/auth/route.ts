import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '@/lib/db/pool'
import { signToken, getAuthUser } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, serverError } from '@/lib/utils/response'
import { z } from 'zod'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

// NOTE: role is intentionally NOT accepted from the request body. Allowing a
// self-registering user to pick their own role is a privilege-escalation hole
// (anyone could register as db_admin). New accounts are always db_viewer;
// elevation must be done by an existing admin out of band.
const RegisterSchema = z.object({
  username: z.string().min(3).max(100),
  email:    z.string().email(),
  password: z.string().min(6),
})

const MAX_AGE = 8 * 60 * 60 // 8h, matches JWT default

// Store the JWT in an httpOnly cookie so it is never readable by JS (XSS-safe).
function attachAuthCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   MAX_AGE,
  })
  return res
}

// ── Simple in-memory login rate limiter (per IP) ────────────────────────────
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 10

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > MAX_ATTEMPTS
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'logout') {
      const res = NextResponse.json({ success: true, data: { message: 'Logged out' } })
      res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
      return res
    }

    const body = await req.json()

    if (action === 'login') {
      if (rateLimited(clientIp(req))) return error('Too many attempts. Try again later.', 429)

      const parsed = LoginSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { username, password } = parsed.data

      const user = await queryOne<any>(
        'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
        [username]
      )
      if (!user) return unauthorized('Invalid username or password')

      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) return unauthorized('Invalid username or password')

      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])

      const token = await signToken({ userId: user.id, username: user.username, role: user.role })
      const res = ok({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } })
      return attachAuthCookie(res as NextResponse, token)
    }

    if (action === 'register') {
      const parsed = RegisterSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { username, email, password } = parsed.data

      const existing = await queryOne(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      )
      if (existing) return error('Username or email already exists', 409)

      const password_hash = await bcrypt.hash(password, 12)

      // Role is always the least-privileged tier on self-registration.
      const newUser = await queryOne<any>(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'db_viewer')
         RETURNING id, username, email, role, created_at`,
        [username, email, password_hash]
      )

      const token = await signToken({ userId: newUser.id, username: newUser.username, role: newUser.role })
      const res = created({ token, user: newUser })
      return attachAuthCookie(res as NextResponse, token)
    }

    return error('Invalid action. Use ?action=login, register or logout')
  } catch (err) {
    return serverError(err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const user = await queryOne<any>(
      'SELECT id, username, email, role, created_at, last_login_at FROM users WHERE id = $1',
      [authUser.userId]
    )
    if (!user) return unauthorized()

    return ok(user)
  } catch (err) {
    return serverError(err)
  }
}
