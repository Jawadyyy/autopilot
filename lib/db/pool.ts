import { Pool, PoolClient } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      `postgresql://${process.env.POSTGRES_USER}:` +
      `${process.env.POSTGRES_PASSWORD}@` +
      `${process.env.POSTGRES_HOST}:` +
      `${process.env.POSTGRES_PORT}/` +
      `${process.env.POSTGRES_DB}?sslmode=require`

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
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