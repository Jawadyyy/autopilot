import { Pool, PoolClient, types } from 'pg'

// node-postgres returns numeric (OID 1700) and bigint/int8 (OID 20) as strings
// to avoid precision loss. For this app's metrics those values are display
// numbers (bloat %, costs, row counts, sizes), so parse them as JS numbers.
// pg.types is module-global, so this also applies to the external pools used
// for monitoring. Values beyond 2^53 would lose precision, which none of these
// catalog/metric figures reach.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)))
types.setTypeParser(20,   (v) => (v === null ? null : parseInt(v, 10)))

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    // Fail fast with a clear message instead of silently defaulting to a
    // localhost connection that won't exist.
    for (const key of ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'] as const) {
      if (!process.env[key]) throw new Error(`${key} environment variable is not set`)
    }
    pool = new Pool({
      host:     process.env.POSTGRES_HOST,
      port:     parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user:     process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      max:      20,
      idleTimeoutMillis:       30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    })
    pool.on('error', (err) => console.error('PG pool error:', err))
  }
  return pool
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect()
  try {
    const result = await client.query(sql, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}