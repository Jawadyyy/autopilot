// Auth moved to Supabase Auth (see lib/auth/ownership.ts and lib/supabase/*).
// This module is kept as a stable import path: routes that did
//   import { getAuthUser } from '@/lib/auth/jwt'
// keep working. New code should import from '@/lib/auth/ownership' directly.
export * from './ownership'
