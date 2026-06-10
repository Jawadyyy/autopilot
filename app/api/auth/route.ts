import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, unauthorized, serverError } from '@/lib/utils/response'

// Auth (signup / login / forgot-password / logout) is handled client-side via
// Supabase Auth (see lib/supabase/client.ts and the /login, /signup,
// /forgot-password, /reset-password pages). This endpoint just returns the
// current user's profile (id, email, role) for the UI.
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    return ok({ id: authUser.userId, email: authUser.email, role: authUser.role })
  } catch (err) {
    return serverError(err)
  }
}
