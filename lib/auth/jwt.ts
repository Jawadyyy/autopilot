import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export type UserRole = 'db_viewer' | 'db_operator' | 'db_admin'

export interface JWTPayload {
  userId:   string
  username: string
  role:     UserRole
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret')

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '8h')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JWTPayload
}

export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies.get('token')?.value
    if (!token) return null
    return await verifyToken(token)
  } catch {
    return null
  }
}

const ROLE_LEVELS: Record<UserRole, number> = {
  db_viewer:   1,
  db_operator: 2,
  db_admin:    3,
}

export function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[required]
}