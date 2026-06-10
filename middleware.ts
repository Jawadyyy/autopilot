import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Protect authenticated app pages. Auth now rides on Supabase SSR session
// cookies; updateSession() refreshes them and returns the validated user.
// API routes do their own auth via getAuthUser, so they're not matched here.

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { supabaseResponse, user } = await updateSession(req)

  // Landing + auth pages always pass through (but keep refreshed cookies).
  if (pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  if (user) return supabaseResponse

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
