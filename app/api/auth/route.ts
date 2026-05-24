import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '@/lib/db/pool'
import { signToken, getAuthUser } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, serverError } from '@/lib/utils/response'
import { z } from 'zod'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const RegisterSchema = z.object({
  username: z.string().min(3).max(100),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['db_viewer', 'db_operator', 'db_admin']).default('db_viewer'),
})

// POST /api/auth?action=login  or  ?action=register
export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')
    const body   = await req.json()

    // ── LOGIN ─────────────────────────────────────────────
    if (action === 'login') {
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

      // Update last login
      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])

      const token = await signToken({
        userId:   user.id,
        username: user.username,
        role:     user.role,
      })

      return ok({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } })
    }

    // ── REGISTER ──────────────────────────────────────────
    if (action === 'register') {
      const parsed = RegisterSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { username, email, password, role } = parsed.data

      // Check duplicate
      const existing = await queryOne(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      )
      if (existing) return error('Username or email already exists', 409)

      const password_hash = await bcrypt.hash(password, 12)

      const newUser = await queryOne<any>(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, role, created_at`,
        [username, email, password_hash, role]
      )

      const token = await signToken({
        userId:   newUser.id,
        username: newUser.username,
        role:     newUser.role,
      })

      return created({ token, user: newUser })
    }

    return error('Invalid action. Use ?action=login or ?action=register')

  } catch (err) {
    return serverError(err)
  }
}

// GET /api/auth — returns current logged in user info
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