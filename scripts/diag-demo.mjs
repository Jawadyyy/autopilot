// Diagnostic: connect to the demo DB exactly like the app does (raw pg.Pool,
// no SSL block) and run the scanner's key queries. Prints rows or the error so
// we can see what the app sees over the Supabase pooler.
//
// Run (PowerShell) — set each field separately so special chars in the
// password (?, *, &) don't break URL parsing:
//   $env:PGHOST="aws-0-<region>.pooler.supabase.com"
//   $env:PGUSER="postgres.vkuiacwubxxrkrcjxmxu"
//   $env:PGPASSWORD="your-raw-password"
//   $env:PGDATABASE="postgres"
//   $env:PGPORT="5432"
//   node scripts/diag-demo.mjs
//
// The values live only in your shell env for this run. Close the shell after.

import pg from 'pg'
const { Pool } = pg

const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE = 'postgres', PGPORT = '5432' } = process.env
if (!PGHOST || !PGUSER || !PGPASSWORD) {
  console.error('Set PGHOST, PGUSER, PGPASSWORD (and optionally PGDATABASE, PGPORT) env vars.')
  process.exit(1)
}

const pool = new Pool({
  host: PGHOST, user: PGUSER, password: PGPASSWORD,
  database: PGDATABASE, port: Number(PGPORT),
  max: 1, connectionTimeoutMillis: 8000,
})

async function run(label, sql) {
  try {
    const { rows } = await pool.query(sql)
    console.log(`\n=== ${label} === (${rows.length} rows)`)
    console.table(rows)
  } catch (e) {
    console.log(`\n=== ${label} === ERROR: ${e.message}`)
  }
}

await run('whoami / db', `SELECT current_user, current_database(), version()`)

await run('metrics', `
  SELECT
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle')   AS idle_connections,
    (SELECT ROUND(sum(blks_hit)::numeric / NULLIF(sum(blks_hit)+sum(blks_read),0)*100,2)
       FROM pg_stat_database) AS cache_hit_ratio`)

await run('bloat (n_dead_tup > 50)', `
  SELECT schemaname, relname, n_dead_tup,
         ROUND(n_dead_tup::numeric/NULLIF(n_live_tup+n_dead_tup,0)*100,2) AS bloat_pct
    FROM pg_stat_user_tables
   WHERE n_dead_tup > 50
   ORDER BY bloat_pct DESC NULLS LAST LIMIT 5`)

await run('seq scans (seq_scan > 50, >1000 rows)', `
  SELECT schemaname, relname, seq_scan, idx_scan, n_live_tup
    FROM pg_stat_user_tables
   WHERE seq_scan > 50 AND n_live_tup > 1000
     AND (idx_scan IS NULL OR seq_scan > idx_scan * 2)
   ORDER BY seq_scan DESC LIMIT 5`)

await run('all public tables this role sees', `
  SELECT relname, seq_scan, n_live_tup, n_dead_tup
    FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY relname`)

await run('slow queries (pg_stat_statements > 500ms)', `
  SELECT ROUND(mean_exec_time::numeric,1) AS mean_ms, calls, LEFT(query,50) AS q
    FROM pg_stat_statements WHERE mean_exec_time > 500 ORDER BY mean_exec_time DESC LIMIT 5`)

await pool.end()
