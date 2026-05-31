import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// Mock users for demo
const MOCK_USERS = [
  { id: 'user-1', identifier: 'sre-team', token: 'demo-token-123', role: 'db_admin', name: 'Admin User' },
  { id: 'user-2', identifier: 'db-operator', token: 'operator-token', role: 'db_operator', name: 'Operator' },
  { id: 'user-3', identifier: 'viewer', token: 'viewer-token', role: 'db_viewer', name: 'Viewer' },
]

function generateJWT(userId: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(JSON.stringify({
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  })).toString('base64')
  
  const signature = createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
    .update(`${header}.${payload}`)
    .digest('base64')
  
  return `${header}.${payload}.${signature}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, token, role } = body

    if (!identifier || !token || !role) {
      return NextResponse.json(
        { message: 'Missing identifier, token, or role' },
        { status: 400 }
      )
    }

    // Find user in mock data
    const user = MOCK_USERS.find(
      u => u.identifier === identifier && u.token === token && u.role === role
    )

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const jwtToken = generateJWT(user.id, user.role)

    return NextResponse.json({
      token: jwtToken,
      user: {
        id: user.id,
        identifier: user.identifier,
        role: user.role,
        name: user.name
      }
    })
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.json(
      { message: 'Authentication failed' },
      { status: 500 }
    )
  }
}