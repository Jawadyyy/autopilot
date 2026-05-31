import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, unauthorized, serverError, error } from '@/lib/utils/response'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const severity = req.nextUrl.searchParams.get('severity')
    const query = supabaseAdmin
      .from('detected_issues')
      .select('id,detected_at,severity,title,description,affected_table,affected_query,is_resolved')
      .order('detected_at', { ascending: false })
      .limit(100)

    if (severity && severity !== 'all') {
      query.eq('severity', severity)
    }

    const { data, error: fetchError } = await query
    if (fetchError) return error(fetchError.message)

    return ok(data)
  } catch (err: any) {
    return serverError(err)
  }
}
