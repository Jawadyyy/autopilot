import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Protect authenticated app pages: if there's no valid session cookie, send the
// user to /login. API routes do their own auth via getAuthUser, so they're not
// matched here. Verification uses jose (works in the edge runtime).

const PUBLIC_PATHS = ['/login']

async function hasValidToken(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('token')?.value
  if (!token) return false
  const secret = process.env.JWT_SECRET
  if (!secret) return false
  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow the landing page and the login page through untouched.
  if (pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (await hasValidToken(req)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

// Match app pages only — exclude api, static assets, the landing page handled above.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/connections/:path*',
    '/live-health/:path*',
    '/plan-diff/:path*',
    '/locks/:path*',
    '/autopilot/:path*',
    '/schema/:path*',
    '/backup/:path*',
    '/olap/:path*',
    '/json-explorer/:path*',
    '/report/:path*',
  ],
}
