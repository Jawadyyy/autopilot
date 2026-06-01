// Auth now rides on an httpOnly `token` cookie, so the client no longer reads or
// sends the JWT itself — same-origin requests include the cookie automatically.
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  })

  // Session expired / not authenticated → bounce to login.
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('user')
    localStorage.removeItem('user_role')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Session expired')
  }

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
