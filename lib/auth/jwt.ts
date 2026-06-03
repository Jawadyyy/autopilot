import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export type UserRole = 'db_viewer' | 'db_operator' | 'db_admin'

// Role is optional — role checks are neutralized so every authenticated
// user shares the same interface. Keeping the field preserves compatibility
// with existing tokens and DB rows.
export interface JWTPayload {
  userId:   string
  username: string
  role?:    UserRole
}

// Never fall back to a hardcoded secret — an unset JWT_SECRET would let anyone
// forge tokens. Resolve it lazily so a missing var fails the request, not the build.
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as JWTPayload
}

export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies.get('token')?.value
    if (!token) return null
    const payload = await verifyToken(token)
    // ensure a role property exists for compatibility with UI code
    if (!payload.role) payload.role = 'db_viewer'
    return payload
  } catch {
    return null
  }
}

// Role checks are intentionally disabled — return true for all checks so
// routes using `hasRole()` keep working without enforcing permissions.
export function hasRole(_userRole: UserRole | undefined, _required: UserRole): boolean {
  return true
}