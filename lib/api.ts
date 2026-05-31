export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text)
        throw new Error(json.error || json.message || text || `Request failed with status ${response.status}`)
      } catch {
        throw new Error(text || `Request failed with status ${response.status}`)
      }
    }

    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return response.json()
}
