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

// Postgres identifiers can't be bound as query parameters, so DDL built from
// user input must be validated as a strict identifier to prevent SQL injection.
const IDENT = /^[A-Za-z_][A-Za-z0-9_$]*$/

function assertIdent(value: string, label: string): string {
  if (!IDENT.test(value)) {
    throw new Error(`Invalid ${label}: must be a valid identifier`)
  }
  return value
}

// Allow optionally schema-qualified object names (e.g. "public.orders").
function assertQualifiedName(value: string, label: string): string {
  const parts = value.split('.')
  if (parts.length > 2) throw new Error(`Invalid ${label}`)
  const quoted = parts.map((p) => `"${assertIdent(p, label)}"`)
  return quoted.join('.')
}

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
      const safeRole = assertIdent(roleName, 'roleName')

      // The password is a string literal in CREATE ROLE and cannot be bound;
      // reject characters that could break out of the literal.
      if (password && /['\\;]/.test(password)) {
        return error('Password contains disallowed characters')
      }

      let sql = `CREATE ROLE "${safeRole}"`
      if (canLogin)  sql += ` LOGIN`
      if (password)  sql += ` PASSWORD '${password}'`

      await queryExternal(connectionId, sql)
      return created({ message: `Role "${safeRole}" created successfully` })
    }

    // ── GRANT ─────────────────────────────────────────────
    if (action === 'grant') {
      const parsed = GrantSchema.safeParse(body)
      if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

      const { connectionId, roleName, targetObject, objectType, privileges } = parsed.data
      const safeRole   = assertIdent(roleName, 'roleName')
      const safeObject = assertQualifiedName(targetObject, 'targetObject')
      const privList   = privileges.join(', ') // values are enum-validated by zod

      await queryExternal(
        connectionId,
        `GRANT ${privList} ON ${objectType} ${safeObject} TO "${safeRole}"`
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
      const safeRole   = assertIdent(roleName, 'roleName')
      const safeObject = assertQualifiedName(targetObject, 'targetObject')
      const privList   = privileges.join(', ') // values are enum-validated by zod

      await queryExternal(
        connectionId,
        `REVOKE ${privList} ON ${objectType} ${safeObject} FROM "${safeRole}"`
      )

      return ok({ message: `Revoked ${privList} on ${targetObject} from ${roleName}` })
    }

    // ── ENABLE ROW LEVEL SECURITY ─────────────────────────
    if (action === 'enable_rls') {
      const { connectionId, tableName, policyName, policyUsing } = body
      if (!connectionId || !tableName) return error('Missing connectionId or tableName')

      const safeTable = assertQualifiedName(String(tableName), 'tableName')

      await queryExternal(connectionId, `ALTER TABLE ${safeTable} ENABLE ROW LEVEL SECURITY`)

      if (policyName && policyUsing) {
        const safePolicy = assertIdent(String(policyName), 'policyName')
        // policyUsing is a raw SQL boolean expression by design (admin-only).
        await queryExternal(
          connectionId,
          `CREATE POLICY "${safePolicy}" ON ${safeTable} USING (${policyUsing})`
        )
      }

      return ok({ message: `RLS enabled on ${tableName}` })
    }

    return error('Invalid action')
  } catch (err) {
    return serverError(err)
  }
}