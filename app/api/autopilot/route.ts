import { NextRequest } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db/pool'
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

    const type = req.nextUrl.searchParams.get('type') || 'rules'

    if (type === 'rules') {
      const rules = await query(`SELECT * FROM autopilot_rules ORDER BY created_at DESC`)
      return ok(rules)
    }

    if (type === 'actions') {
      const actions = await query(
        `SELECT * FROM v_action_log LIMIT 100`
      )
      return ok(actions)
    }

    if (type === 'effectiveness') {
      const data = await query(`SELECT * FROM v_rule_effectiveness`)
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

      const rule = await queryOne<any>(
        `INSERT INTO autopilot_rules
           (name, issue_type, trigger_condition, action_sql_template, action_description, mode)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          parsed.data.name,
          parsed.data.issue_type,
          parsed.data.trigger_condition,
          parsed.data.action_sql_template ?? null,
          parsed.data.action_description,
          parsed.data.mode,
        ]
      )
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

    const updated = await queryOne<any>(
      `UPDATE autopilot_rules
       SET
         mode      = COALESCE($1, mode),
         is_active = COALESCE($2, is_active)
       WHERE id = $3
       RETURNING *`,
      [mode ?? null, is_active ?? null, id]
    )
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

    const deleted = await queryOne(
      'DELETE FROM autopilot_rules WHERE id = $1 RETURNING id', [id]
    )
    if (!deleted) return notFound('Rule')

    return ok({ message: 'Rule deleted' })
  } catch (err) {
    return serverError(err)
  }
}