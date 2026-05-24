import * as mssql from 'mssql'

let pool: mssql.ConnectionPool | null = null

export async function getMssqlPool(): Promise<mssql.ConnectionPool> {
  if (pool && pool.connected) return pool

  pool = await new mssql.ConnectionPool({
    server:   process.env.MSSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MSSQL_PORT || '1433'),
    database: process.env.MSSQL_DB       || 'db_autopilot_olap',
    user:     process.env.MSSQL_USER     || 'sa',
    password: process.env.MSSQL_PASSWORD || '',
    options:  { encrypt: true, trustServerCertificate: true },
    pool:     { max: 10, idleTimeoutMillis: 30000 },
  }).connect()

  return pool
}

export async function queryMssql<T = any>(
  sql: string,
  params?: Record<string, any>
): Promise<T[]> {
  const p       = await getMssqlPool()
  const request = p.request()
  if (params) {
    Object.entries(params).forEach(([key, val]) => request.input(key, val))
  }
  const result = await request.query(sql)
  return result.recordset as T[]
}