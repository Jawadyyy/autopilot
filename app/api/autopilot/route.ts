import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { getAuthUser, requireConnection, ownedConnectionIds } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, forbidden, notFound, serverError } from '@/lib/utils/response'
import { ensureSchema } from '@/lib/db/ensureSchema'
import { z } from 'zod'

const RuleSchema = z.object({
  name:                z.string().min(1).max(255),
  issue_type:          z.enum(['slow_query', 'missing_index', 'deadlock', 'table_bloat', 'idle_connections', 'lock_contention', 'long_transaction', 'unused_index']),
  trigger_condition:   z.string().min(1),
  action_sql_template: z.string().optional(),
  action_description:  z.string().min(1),
  mode:                z.enum(['auto', 'suggest', 'off']).default('suggest'),
})

// True when the issue belongs to a connection the caller may access. Used to
// keep apply_fix / dismiss scoped to the user's own databases.
async function ownsIssue(
  authUser: import('@/lib/auth/jwt').AuthUser,
  issueId: string
): Promise<boolean> {
  const issue = await queryOne<{ connection_id: string }>(
    `SELECT connection_id FROM detected_issues WHERE id = $1`, [issueId]
  )
  if (!issue) return false
  return !!(await requireConnection(authUser, issue.connection_id, 'id'))
}

// GET /api/autopilot?type=rules|actions|effectiveness
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    await ensureSchema()

    const type = req.nextUrl.searchParams.get('type') || 'rules'

    // Rules themselves are a global engine config (readable by all), but every
    // action/effectiveness aggregate is scoped to the caller's own connections.
    const ids = await ownedConnectionIds(authUser)
    const scoped = ids !== null
    // Only count actions tied to issues on connections the caller owns.
    const ownActionFilter = scoped
      ? `AND a.issue_id IN (SELECT id FROM detected_issues WHERE connection_id = ANY($1))`
      : ''
    const aggParams = scoped ? [ids] : undefined

    if (type === 'rules') {
      // Aggregate success/fail counts straight from autopilot_actions so we don't
      // depend on a possibly-stale v_rule_effectiveness view. Falls back to the
      // bare rule list if the actions table shape differs on older installs.
      try {
        const rules = await query(`
          SELECT r.*,
                 COUNT(a.id) FILTER (WHERE a.status = 'applied') AS success_count,
                 COUNT(a.id) FILTER (WHERE a.status = 'failed')  AS fail_count,
                 ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status = 'applied')
                       / NULLIF(COUNT(a.id), 0), 2)              AS success_rate
            FROM autopilot_rules r
            LEFT JOIN autopilot_actions a ON a.rule_id = r.id ${ownActionFilter}
           GROUP BY r.id
           ORDER BY r.created_at DESC`, aggParams)
        return ok(rules)
      } catch {
        const rules = await query(`SELECT * FROM autopilot_rules ORDER BY created_at DESC`)
        return ok(rules)
      }
    }

    if (type === 'actions') {
      if (!scoped) {
        const actions = await query(`SELECT * FROM v_action_log LIMIT 100`)
        return ok(actions)
      }
      const actions = await query(`
        SELECT a.id, a.action_type, a.status, a.applied_at, a.outcome_notes, a.sql_applied,
               i.issue_type, i.severity, i.affected_table,
               c.name AS connection_name, r.name AS rule_name
          FROM autopilot_actions a
          LEFT JOIN detected_issues       i ON i.id = a.issue_id
          LEFT JOIN monitored_connections c ON c.id = i.connection_id
          LEFT JOIN autopilot_rules       r ON r.id = a.rule_id
         WHERE i.connection_id = ANY($1)
         ORDER BY a.applied_at DESC
         LIMIT 100`, [ids])
      return ok(actions)
    }

    if (type === 'effectiveness') {
      if (!scoped) {
        const data = await query(`SELECT * FROM v_rule_effectiveness`)
        return ok(data)
      }
      const data = await query(`
        SELECT r.id AS rule_id, r.name, r.issue_type, r.mode, r.is_active,
               COUNT(a.id)                                     AS total_actions,
               COUNT(a.id) FILTER (WHERE a.status = 'applied') AS applied_count,
               COUNT(a.id) FILTER (WHERE a.status = 'failed')  AS failed_count,
               ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status = 'applied')
                     / NULLIF(COUNT(a.id), 0), 2)              AS success_rate
          FROM autopilot_rules r
          LEFT JOIN autopilot_actions a ON a.rule_id = r.id ${ownActionFilter}
         GROUP BY r.id`, aggParams)
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
    // Rules drive the shared autofix engine, so only the admin manages them.
    if (action === 'create_rule') {
      if (authUser.role !== 'admin') return forbidden()

      const parsed = RuleSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const rule = await queryOne(
        `INSERT INTO autopilot_rules
           (name, issue_type, trigger_condition, action_sql_template, action_description, mode)
         VALUES ($1, $2, $3, $4, $5, $6)
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
      const { issue_id, rule_id, action_type, sql_to_run } = body
      if (!issue_id || !action_type) return error('Missing issue_id or action_type')
      if (!(await ownsIssue(authUser, issue_id))) return notFound('Issue')

      await query(
        `CALL sp_apply_fix($1, $2, $3, $4, $5)`,
        [issue_id, rule_id ?? null, action_type, sql_to_run ?? null, authUser.userId]
      )

      return ok({ message: 'Fix applied successfully' })
    }

    // ── DISMISS ISSUE ─────────────────────────────────────
    if (action === 'dismiss') {
      const { issue_id } = body
      if (!issue_id) return error('Missing issue_id')
      if (!(await ownsIssue(authUser, issue_id))) return notFound('Issue')

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
    if (authUser.role !== 'admin') return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing rule id')

    const { mode, is_active } = await req.json()

    // COALESCE keeps existing values when a field is omitted from the request.
    const updated = await queryOne(
      `UPDATE autopilot_rules
          SET mode      = COALESCE($1, mode),
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
    if (authUser.role !== 'admin') return forbidden()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return error('Missing rule id')

    const deleted = await queryOne(
      `DELETE FROM autopilot_rules WHERE id = $1 RETURNING id`,
      [id]
    )
    if (!deleted) return notFound('Rule')

    return ok({ message: 'Rule deleted' })
  } catch (err) {
    return serverError(err)
  }
}
