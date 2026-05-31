// Shared in-memory Server-Sent Events hub. Both the /api/ws stream and the
// monitor route import from here so events broadcast from anywhere reach all
// connected dashboards. (Single-instance; fine for this app's scope.)

type FeedEvent = { type: string; payload: unknown; timestamp: string }

const clients = new Set<ReadableStreamDefaultController>()
const encoder = new TextEncoder()

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller)
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller)
}

export function clientCount() {
  return clients.size
}

export function broadcast(event: { type: string; payload: unknown }) {
  const data: FeedEvent = { ...event, timestamp: new Date().toISOString() }
  const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
  for (const controller of clients) {
    try {
      controller.enqueue(chunk)
    } catch {
      clients.delete(controller)
    }
  }
}
