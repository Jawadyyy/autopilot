import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getAuthUser, hasRole } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, forbidden, notFound, serverError } from '@/lib/utils/response'
import { z } from 'zod'

const GrantSchema = z.object({
  connectionId: z.string().uuid(),
  roleName:     z.string().min(1),
  targetObject: z.string().min(1),
  objectType:   z.enum(['TABLE', 'VIEW', 'SEQUENCE', 'FUNCTION']),
  privileges:   z.array(z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'])).min(1),
})

const CreateRoleSchema = z.object({
  connectionId: z.string().uuid(),
  roleName:     z.string().min(1).max(100),
  canLogin:     z.boolean().default(false),
  password:     z.string().optional(),
})

// GET /api/roles?connectionId=xxx&type=roles|privileges|rls
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const connectionId = req.nextUrl.searchParams.get('connectionId')
    const type         = req.nextUrl.searchParams.get('type') || 'roles'

    if (!connectionId) return error('Missing connectionId')

    if (type === 'roles') {
      // List all roles on the external database
      const roles = await queryExternal<any>(connectionId, `
        SELECT
          rolname        AS role_name,
          rolcanlogin    AS can_login,
          rolsuper       AS is_superuser,
          rolcreatedb    AS can_create_db,
          rolcreaterole  AS can_create_role,
          rolvaliduntil  AS valid_until
        FROM pg_roles
        WHERE rolname NOT LIKE 'pg_%'
        ORDER BY rolname
      `)
      return ok(roles)
    }

    if (type === 'privileges') {
      // Table privileges on external DB
      const privileges = await queryExternal<any>(connectionId, `
        SELECT
          grantee,
          table_schema,
          table_name,
          privilege_type,
          is_grantable
        FROM information_schema.role_table_grants
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY grantee, table_name
      `)
      return ok(privileges)
    }

    if (type === 'rls') {
      // Row level security policies
      const policies = await queryExternal<any>(connectionId, `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        ORDER BY tablename, policyname
      `)
      return ok(policies)
    }

    return error('Invalid type. Use roles, privileges or rls')
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/roles?action=create_role|grant|revoke|enable_rls
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()
    if (!hasRole(authUser.role, 'db_admin')) return forbidden()

    const action = req.nextUrl.searchParams.get('action')
    const body   = await req.json()

    // ── CREATE ROLE ───────────────────────────────────────
    if (action === 'create_role') {
      const parsed = CreateRoleSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { connectionId, roleName, canLogin, password } = parsed.data

      let sql = `CREATE ROLE "${roleName}"`
      if (canLogin)  sql += ` LOGIN`
      if (password)  sql += ` PASSWORD '${password}'`

      await queryExternal(connectionId, sql)
      return created({ message: `Role "${roleName}" created successfully` })
    }

    // ── GRANT ─────────────────────────────────────────────
    if (action === 'grant') {
      const parsed = GrantSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { connectionId, roleName, targetObject, objectType, privileges } = parsed.data
      const privList = privileges.join(', ')

      await queryExternal(
        connectionId,
        `GRANT ${privList} ON ${objectType} ${targetObject} TO "${roleName}"`
      )

      // Log to our audit table
      await query(
        `INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
         VALUES ($1, 'INSERT', $2, $3, $4)`,
        [
          targetObject, roleName,
          JSON.stringify({ action: 'GRANT', privileges, objectType }),
          authUser.username
        ]
      )

      return ok({ message: `Granted ${privList} on ${targetObject} to ${roleName}` })
    }

    // ── REVOKE ────────────────────────────────────────────
    if (action === 'revoke') {
      const parsed = GrantSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { connectionId, roleName, targetObject, objectType, privileges } = parsed.data
      const privList = privileges.join(', ')

      await queryExternal(
        connectionId,
        `REVOKE ${privList} ON ${objectType} ${targetObject} FROM "${roleName}"`
      )

      return ok({ message: `Revoked ${privList} on ${targetObject} from ${roleName}` })
    }

    // ── ENABLE ROW LEVEL SECURITY ─────────────────────────
    if (action === 'enable_rls') {
      const { connectionId, tableName, policyName, policyUsing } = body
      if (!connectionId || !tableName) return error('Missing connectionId or tableName')

      await queryExternal(connectionId, `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`)

      if (policyName && policyUsing) {
        await queryExternal(
          connectionId,
          `CREATE POLICY "${policyName}" ON "${tableName}" USING (${policyUsing})`
        )
      }

      return ok({ message: `RLS enabled on ${tableName}` })
    }

    return error('Invalid action')
  } catch (err) {
    return serverError(err)
  }
}