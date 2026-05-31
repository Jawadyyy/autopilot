import { Pool } from 'pg'
import * as mssql from 'mssql'
import { query } from './pool'
import { decrypt } from '../utils/crypto'

const pgPools    = new Map<string, Pool>()
const mssqlPools = new Map<string, mssql.ConnectionPool>()

interface ConnectionRow {
  id:                 string
  host:               string
  port:               number
  db_name:            string
  username:           string
  password_encrypted: string
  db_type:            'postgresql' | 'mssql'
}

export async function getExternalPgPool(connectionId: string): Promise<Pool> {
  if (pgPools.has(connectionId)) return pgPools.get(connectionId)!

  const rows = await query<ConnectionRow>(
    'SELECT * FROM monitored_connections WHERE id = $1 AND db_type = $2',
    [connectionId, 'postgresql']
  )
  if (!rows[0]) throw new Error(`Connection ${connectionId} not found`)

  const c        = rows[0]
  const password = decrypt(c.password_encrypted)

  const pool = new Pool({
    host:                    c.host,
    port:                    c.port,
    database:                c.db_name,
    user:                    c.username,
    password,
    max:                     5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis:       60000,
  })

  pool.on('error', () => pgPools.delete(connectionId))
  pgPools.set(connectionId, pool)
  return pool
}

export async function getExternalMssqlPool(connectionId: string): Promise<mssql.ConnectionPool> {
  if (mssqlPools.has(connectionId)) return mssqlPools.get(connectionId)!

  const rows = await query<ConnectionRow>(
    'SELECT * FROM monitored_connections WHERE id = $1 AND db_type = $2',
    [connectionId, 'mssql']
  )
  if (!rows[0]) throw new Error(`Connection ${connectionId} not found`)

  const c        = rows[0]
  const password = decrypt(c.password_encrypted)

  const pool = await new mssql.ConnectionPool({
    server:   c.host,
    port:     c.port,
    database: c.db_name,
    user:     c.username,
    password,
    options:  { encrypt: true, trustServerCertificate: true },
    pool:     { max: 5, idleTimeoutMillis: 60000 },
  }).connect()

  mssqlPools.set(connectionId, pool)
  return pool
}

export async function queryExternal<T = any>(
  connectionId: string,
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool   = await getExternalPgPool(connectionId)
  const client = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

export async function queryExternalMssql<T = any>(
  connectionId: string,
  sql: string
): Promise<T[]> {
  const pool   = await getExternalMssqlPool(connectionId)
  const result = await pool.request().query(sql)
  return result.recordset as T[]
}

export async function testConnection(
  host: string, port: number, dbName: string,
  username: string, password: string,
  dbType: 'postgresql' | 'mssql'
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  if (dbType === 'postgresql') {
    const pool = new Pool({ host, port, database: dbName, user: username, password, max: 1, connectionTimeoutMillis: 5000 })
    try {
      const client = await pool.connect()
      try {
        await client.query('SELECT 1')
      } finally {
        client.release()
      }
      return { success: true, latencyMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message }
    } finally {
      // Always close the throwaway pool — on the error path too — to avoid leaks.
      await pool.end().catch(() => {})
    }
  } else {
    let pool: mssql.ConnectionPool | null = null
    try {
      pool = await new mssql.ConnectionPool({
        server: host, port, database: dbName, user: username, password,
        options: { encrypt: true, trustServerCertificate: true },
      }).connect()
      await pool.request().query('SELECT 1')
      return { success: true, latencyMs: Date.now() - start }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message }
    } finally {
      if (pool) await pool.close().catch(() => {})
    }
  }
}

export async function removePool(connectionId: string, dbType: 'postgresql' | 'mssql') {
  if (dbType === 'postgresql') {
    const pool = pgPools.get(connectionId)
    if (pool) { await pool.end(); pgPools.delete(connectionId) }
  } else {
    const pool = mssqlPools.get(connectionId)
    if (pool) { await pool.close(); mssqlPools.delete(connectionId) }
  }
}