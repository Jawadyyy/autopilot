import { NextRequest } from 'next/server'
import { query } from '@/lib/db/pool'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, forbidden, notFound, serverError } from '@/lib/utils/response'
import { z } from 'zod'

const RuleSchema = z.object({
  name:                z.string().min(1).max(255),
  issue_type:          z.enum(['slow_query', 'missing_index', 'deadlock', 'table_bloat', 'idle_connections', 'lock_contention', 'long_transaction', 'unused_index']),
  trigger_condition:   z.string().min(1),
  action_sql_template: z.string().optional(),
  action_description:  z.string().min(1),
  mode:                z.enum(['auto', 'suggest', 'off']).default('suggest'),
})

// GET /api/autopilot?type=rules|actions|log
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) return serverError('Database not available')
    const type = req.nextUrl.searchParams.get('type') || 'rules'

    if (type === 'rules') {
      const { data: rules, error: rulesError } = await supabaseAdmin
        .from('autopilot_rules')
        .select('*')
        .order('created_at', { ascending: false })
      if (rulesError) throw rulesError
      return ok(rules)
    }

    if (type === 'actions') {
      const { data: actions, error: actionsError } = await supabaseAdmin
        .from('v_action_log')
        .select('*')
        .limit(100)
      if (actionsError) throw actionsError
      return ok(actions)
    }

    if (type === 'effectiveness') {
      const { data, error: effError } = await supabaseAdmin
        .from('v_rule_effectiveness')
        .select('*')
      if (effError) throw effError
      return ok(data)
    }

    return error('Invalid type. Use rules, actions or effectiveness')
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/autopilot?action=create_rule|apply_fix|dismiss
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const action = req.nextUrl.searchParams.get('action')
    const body   = await req.json()

    // ── CREATE RULE ───────────────────────────────────────
    if (action === 'create_rule') {
      if (!hasRole(authUser.role, 'db_admin')) return forbidden()

      const parsed = RuleSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { data: rule, error: insertError } = await supabaseAdmin
        .from('autopilot_rules')
        .insert({
          name: parsed.data.name,
          issue_type: parsed.data.issue_type,
          trigger_condition: parsed.data.trigger_condition,
          action_sql_template: parsed.data.action_sql_template ?? null,
          action_description: parsed.data.action_description,
          mode: parsed.data.mode,
        })
        .select('*')
        .single()
      if (insertError) throw insertError
      return created(rule)
    }

    // ── APPLY FIX ─────────────────────────────────────────
    if (action === 'apply_fix') {
      if (!hasRole(authUser.role, 'db_operator')) return forbidden()

      const { issue_id, rule_id, action_type, sql_to_run } = body
      if (!issue_id || !action_type) return error('Missing issue_id or action_type')

      await query(
        `CALL sp_apply_fix($1, $2, $3, $4, $5)`,
        [issue_id, rule_id ?? null, action_type, sql_to_run ?? null, authUser.userId]
      )

      return ok({ message: 'Fix applied successfully' })
    }

    // ── DISMISS ISSUE ─────────────────────────────────────
    if (action === 'dismiss') {
      if (!hasRole(authUser.role, 'db_operator')) return forbidden()

      const { issue_id } = body
      if (!issue_id) return error('Missing issue_id')

      await query(
        `CALL sp_resolve_issue($1, $2, $3)`,
        [issue_id, authUser.userId, 'Dismissed by operator']
      )

      return ok({ message: 'Issue dismissed' })
    }

    return error('Invalid action')
  } catch (err) {
    return serverError(err)
  }
}

// PATCH /api/autopilot?id=xxx — update rule mode or toggle active
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const id   = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing rule id')

    const { mode, is_active } = await req.json()

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('autopilot_rules')
      .update({
        mode: mode ?? undefined,
        is_active: is_active ?? undefined,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError
    if (!updated) return notFound('Rule')

    return ok(updated)
  } catch (err) {
    return serverError(err)
  }
}

// DELETE /api/autopilot?id=xxx — delete a rule
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing rule id')

    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from('autopilot_rules')
      .delete()
      .eq('id', id)
      .select('id')
      .single()

    if (deleteError) throw deleteError
    if (!deleted) return notFound('Rule')

    return ok({ message: 'Rule deleted' })
  } catch (err) {
    return serverError(err)
  }
}