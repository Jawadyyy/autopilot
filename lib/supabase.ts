import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseAdmin: any = null

function initializeSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables not set. Database operations will not be available.')
    return null
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  }
  return supabaseAdmin
}

export { initializeSupabase }
export const getSupabaseAdmin = () => supabaseAdmin || initializeSupabase()

