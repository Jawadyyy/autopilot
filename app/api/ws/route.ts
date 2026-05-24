import { NextRequest } from 'next/server'
import { query } from '@/lib/db/pool'
import { verifyToken } from '@/lib/auth/jwt'

// In-memory set of active WebSocket clients
const clients = new Set<WebSocket>()

// Broadcast an event to all connected clients
export function broadcast(event: { type: string; payload: any }) {
  const message = JSON.stringify({ ...event, timestamp: new Date().toISOString() })
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message)
    }
  })
}

// GET /api/ws — WebSocket upgrade
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token = searchParams.get('token')

  // Verify token before upgrading
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    await verifyToken(token)
  } catch {
    return new Response('Invalid token', { status: 401 })
  }

  // @ts-ignore — Next.js WebSocket upgrade
  const { socket, response } = Deno
    ? await (req as any).upgrade()
    : (() => {
        throw new Error('WebSocket only supported in edge runtime')
      })()

  clients.add(socket)

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type:      'connected',
      payload:   { message: 'Connected to DB Autopilot live feed' },
      timestamp: new Date().toISOString(),
    }))
  }

  socket.onclose = () => {
    clients.delete(socket)
  }

  socket.onerror = () => {
    clients.delete(socket)
  }

  return response
}

// POST /api/ws — internal endpoint to push events
// Called by monitor and autopilot routes when something happens
export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const { type, payload } = body

    if (!type || !payload) {
      return Response.json({ error: 'Missing type or payload' }, { status: 400 })
    }

    broadcast({ type, payload })

    return Response.json({ success: true, clientCount: clients.size })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}