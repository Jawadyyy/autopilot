import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db/pool'
import { queryExternal } from '@/lib/db/connections'
import { getAuthUser } from '@/lib/auth/jwt'
import { ok, created, error, unauthorized, serverError } from '@/lib/utils/response'
import crypto from 'crypto'
import { z } from 'zod'

const CaptureSchema = z.object({
  connectionId: z.string().uuid(),
  queryText:    z.string().min(1),
  issueId:      z.string().uuid().optional(),
  planType:     z.enum(['before_fix', 'after_fix']).default('before_fix'),
})

// Parse EXPLAIN ANALYZE JSON to extract key info
function parsePlan(planJson: any): {
  totalCost:    number
  executionMs:  number
  rowsExamined: number
  hasSeqScan:   boolean
  hasIndexScan: boolean
} {
  const plan       = planJson[0]?.Plan || {}
  const totalCost  = plan['Total Cost']  || 0
  const executionMs = planJson[0]?.['Execution Time'] || 0
  const rowsExamined = plan['Actual Rows'] || 0

  // Recursively check for seq scan / index scan nodes
  function checkNodes(node: any): { seqScan: boolean; indexScan: boolean } {
    let seqScan   = false
    let indexScan = false

    if (node['Node Type'] === 'Seq Scan')   seqScan   = true
    if (node['Node Type'] === 'Index Scan' ||
        node['Node Type'] === 'Index Only Scan') indexScan = true

    for (const child of node['Plans'] || []) {
      const result = checkNodes(child)
      seqScan   = seqScan   || result.seqScan
      indexScan = indexScan || result.indexScan
    }
    return { seqScan, indexScan }
  }

  const { seqScan, indexScan } = checkNodes(plan)

  return {
    totalCost,
    executionMs,
    rowsExamined,
    hasSeqScan:   seqScan,
    hasIndexScan: indexScan,
  }
}

// GET /api/plans?connectionId=xxx&issueId=xxx
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const connectionId = req.nextUrl.searchParams.get('connectionId')
    const issueId      = req.nextUrl.searchParams.get('issueId')

    // Get before/after plans for a specific issue (diff viewer)
    if (issueId) {
      const plans = await query(
        `SELECT * FROM query_plans WHERE related_issue = $1 ORDER BY captured_at ASC`,
        [issueId]
      )
      return ok(plans)
    }

    const cols = `id, connection_id, query_text, plan_type, total_cost,
                  execution_ms, has_seq_scan, has_index_scan, captured_at`

    if (req.nextUrl.searchParams.get('hasSeqScan') === 'true') {
      const plans = await query(
        `SELECT ${cols} FROM query_plans
          WHERE has_seq_scan = TRUE
            AND ($1::uuid IS NULL OR connection_id = $1::uuid)
          ORDER BY execution_ms DESC
          LIMIT 50`,
        [connectionId ?? null]
      )
      return ok(plans)
    }

    const plans = await query(
      `SELECT ${cols} FROM query_plans
        WHERE ($1::uuid IS NULL OR connection_id = $1::uuid)
        ORDER BY captured_at DESC
        LIMIT 100`,
      [connectionId ?? null]
    )
    return ok(plans)
  } catch (err) {
    return serverError(err)
  }
}

// POST /api/plans — capture EXPLAIN ANALYZE from external DB
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const body   = await req.json()
    const parsed = CaptureSchema.safeParse(body)
    if (!parsed.success) return error('Invalid input', 400, parsed.error.flatten())

    const { connectionId, queryText, issueId, planType } = parsed.data

    // Run EXPLAIN ANALYZE on the external database
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${queryText}`
    const rows       = await queryExternal<any>(connectionId, explainSql)
    const planJson   = rows[0]?.['QUERY PLAN'] || rows[0]

    if (!planJson) return error('Failed to capture query plan')

    const queryHash = crypto.createHash('md5').update(queryText.trim().toLowerCase()).digest('hex')
    const parsed2   = parsePlan(planJson)

    const saved = await queryOne(
      `INSERT INTO query_plans
         (connection_id, query_hash, query_text, plan_json, plan_type,
          total_cost, execution_ms, rows_examined, has_seq_scan, has_index_scan, related_issue)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        connectionId,
        queryHash,
        queryText,
        JSON.stringify(planJson),
        planType,
        parsed2.totalCost,
        parsed2.executionMs,
        parsed2.rowsExamined,
        parsed2.hasSeqScan,
        parsed2.hasIndexScan,
        issueId ?? null,
      ]
    )

    return created({ ...(saved as object), parsed: parsed2 })
  } catch (err) {
    return serverError(err)
  }
}

// GET /api/plans/search — JSONB path query (Week 13)
// /api/plans?action=jsonb_search&filter=seq_scan_large_tables
export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return unauthorized()

    const body   = await req.json()
    const { filter, connectionId, minRows } = body

    let sql = ''
    let params: any[] = []

    if (filter === 'seq_scan_large_tables') {
      // Week 13 - JSONB query using jsonb_path_query
      sql = `
        SELECT id, connection_id, query_text, plan_json, execution_ms, captured_at
        FROM query_plans
        WHERE has_seq_scan = TRUE
          AND rows_examined >= $1
          AND ($2::uuid IS NULL OR connection_id = $2::uuid)
          AND plan_json @> '{"0": {"Plan": {"Node Type": "Seq Scan"}}}'::jsonb
        ORDER BY execution_ms DESC
        LIMIT 50
      `
      params = [minRows ?? 10000, connectionId ?? null]
    } else {
      // Generic JSONB search
      sql = `
        SELECT id, connection_id, query_text, plan_json, execution_ms, captured_at
        FROM query_plans
        WHERE plan_json @> $1::jsonb
          AND ($2::uuid IS NULL OR connection_id = $2::uuid)
        ORDER BY captured_at DESC
        LIMIT 50
      `
      params = [JSON.stringify(body.jsonFilter ?? {}), connectionId ?? null]
    }

    const results = await query<any>(sql, params)
    return ok(results)
  } catch (err) {
    return serverError(err)
  }
}