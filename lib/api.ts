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

  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()

  let json: any
  if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(text || `Request failed with status ${response.status}`)
    }
  }

  if (!response.ok) {
    if (json) {
      throw new Error(json.error || json.message || text || `Request failed with status ${response.status}`)
    }
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  if (json && typeof json === 'object') {
    if (json.success === false) {
      throw new Error(json.error || json.message || 'Request failed')
    }
    if ('data' in json) {
      return json.data
    }
  }

  return json ?? text
}
