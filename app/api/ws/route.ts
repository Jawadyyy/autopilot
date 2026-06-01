import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/jwt'
import { addClient, removeClient, broadcast, clientCount } from '@/lib/realtime'

// Next.js App Router route handlers cannot perform a raw WebSocket upgrade
// without a custom server. Server-Sent Events (SSE) give us the same one-way
// "live feed" the dashboard needs (server -> client push) and work natively.
// Auth comes from the httpOnly `token` cookie (EventSource can't set headers).

export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

// GET /api/ws — open an SSE stream of live health events.
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) return new Response('Unauthorized', { status: 401 })

  let heartbeat: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      addClient(controller)
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'connected',
            payload: { message: 'Connected to DB Autopilot live feed' },
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      )
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'))
        } catch {
          removeClient(controller)
          clearInterval(heartbeat)
        }
      }, 30000)
    },
    cancel(controller) {
      removeClient(controller as ReadableStreamDefaultController)
      clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
    },
  })
}

// POST /api/ws — internal endpoint to push a custom event.
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, payload } = await req.json()
    if (!type || !payload) {
      return Response.json({ error: 'Missing type or payload' }, { status: 400 })
    }
    broadcast({ type, payload })
    return Response.json({ success: true, clientCount: clientCount() })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
