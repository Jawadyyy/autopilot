import { createBrowserClient } from '@supabase/ssr'

// Browser Supabase client for the auth pages (login / signup / forgot / reset).
// Uses the public anon (publishable) key; the session lands in cookies that the
// server client and middleware read back.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set')
  }
  return createBrowserClient(url, key)
}
