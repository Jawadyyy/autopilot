-- ============================================================================
-- DB Autopilot — DEMO "MESSY DATABASE" SEED
-- ============================================================================
-- Run this in the SQL Editor of a *separate* Supabase project (NOT your app's
-- primary DB). It plants a pile of problems that db-autopilot's scanner detects:
--
--   • table_bloat    — dead tuples >= 20% (autovacuum disabled so they persist)
--   • missing_index  — large tables hammered by sequential scans, no index
--   • slow_query     — genuinely slow statements recorded in pg_stat_statements
--   • bad schema     — no PK, no FK, everything nullable, wrong types
--
-- Persistent: these show on EVERY scan with no live session needed.
-- Idempotent: drops and recreates the demo_* tables each run.
--
-- After running this, register the project in db-autopilot's UI (Session Pooler
-- creds) and hit Scan. For the live-session issues (locks / idle-in-tx /
-- long-running tx) run db/demo_live_issues.sql in a psql session during the demo.
-- ============================================================================

-- Make sure the scanner can see query timings.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT pg_stat_statements_reset();

-- ── Clean slate ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS demo_orders   CASCADE;
DROP TABLE IF EXISTS demo_events    CASCADE;
DROP TABLE IF EXISTS demo_clicks    CASCADE;
DROP TABLE IF EXISTS demo_logs      CASCADE;
DROP TABLE IF EXISTS demo_sessions  CASCADE;
DROP TABLE IF EXISTS demo_customers CASCADE;

-- ============================================================================
-- BAD SCHEMA DESIGN  (flagged on the Schema graph screen)
--   No primary keys, no foreign keys, everything nullable, money-as-text,
--   timestamps-as-text. Intentionally awful.
-- ============================================================================

-- "customers" — should have a PK on id; doesn't.
CREATE TABLE demo_customers (
  id        integer,            -- no PRIMARY KEY
  email     text,               -- no UNIQUE, nullable
  full_name text,
  country   text,
  signup    text                -- date stored as free text (wrong type)
);

-- "orders" — references a customer but no FK; status is unindexed + heavily filtered.
CREATE TABLE demo_orders (
  id          integer,          -- no PK
  customer_id integer,          -- no FK to demo_customers
  status      text,             -- filtered constantly, never indexed
  amount      text,             -- money stored as text (wrong type)
  created_at  text              -- timestamp as text (wrong type)
);

-- "events" — wide append-only table, no PK, no index.
CREATE TABLE demo_events (
  id      integer,
  kind    text,
  payload text,
  ts      text
);

-- "clicks" — biggest table, no PK, no index, queried by user_id constantly.
CREATE TABLE demo_clicks (
  id      integer,
  user_id integer,
  url     text,
  ts      text
);

-- Bloat targets — autovacuum OFF so the dead tuples we create stick around.
CREATE TABLE demo_logs (
  id    integer,
  level text,
  msg   text
) WITH (autovacuum_enabled = false);

CREATE TABLE demo_sessions (
  id        integer,
  user_id   integer,
  token     text,
  last_seen text
) WITH (autovacuum_enabled = false);

-- ============================================================================
-- BULK DATA  (generate_series = fast inserts, all > 1000 rows)
-- ============================================================================
INSERT INTO demo_customers (id, email, full_name, country, signup)
SELECT g, 'user' || g || '@example.com', 'Customer ' || g,
       (ARRAY['US','UK','DE','IN','BR'])[1 + (g % 5)],
       (NOW() - (g || ' days')::interval)::text
FROM generate_series(1, 3000) g;

INSERT INTO demo_orders (id, customer_id, status, amount, created_at)
SELECT g, 1 + (g % 3000),
       (ARRAY['pending','paid','shipped','cancelled','refunded'])[1 + (g % 5)],
       (round((random() * 500)::numeric, 2))::text,
       (NOW() - (g || ' minutes')::interval)::text
FROM generate_series(1, 6000) g;

INSERT INTO demo_events (id, kind, payload, ts)
SELECT g,
       (ARRAY['click','view','purchase','login','logout'])[1 + (g % 5)],
       '{"v":' || g || '}',
       (NOW() - (g || ' seconds')::interval)::text
FROM generate_series(1, 9000) g;

INSERT INTO demo_clicks (id, user_id, url, ts)
SELECT g, 1 + (g % 3000),
       '/page/' || (g % 50),
       (NOW() - (g || ' seconds')::interval)::text
FROM generate_series(1, 12000) g;

INSERT INTO demo_logs (id, level, msg)
SELECT g, (ARRAY['info','warn','error'])[1 + (g % 3)], 'log line ' || g
FROM generate_series(1, 8000) g;

INSERT INTO demo_sessions (id, user_id, token, last_seen)
SELECT g, 1 + (g % 3000), md5(g::text), NOW()::text
FROM generate_series(1, 5000) g;

-- ============================================================================
-- CREATE BLOAT  (dead tuples >= 20%; autovacuum is off so they persist)
-- ============================================================================
-- demo_logs: delete ~60% → ~60% bloat (HIGH severity).
DELETE FROM demo_logs WHERE id % 5 <> 0;          -- keeps 1/5, deletes 4/5

-- demo_sessions: update every row once → ~50% dead (HIGH severity).
UPDATE demo_sessions SET last_seen = NOW()::text; -- each UPDATE leaves a dead tuple

-- ============================================================================
-- CREATE SEQUENTIAL-SCAN PRESSURE  (missing_index: seq_scan > 50, no index)
--   Stats collector counts these scans even inside a loop.
-- ============================================================================
DO $$
DECLARE i int; junk bigint;
BEGIN
  FOR i IN 1..60 LOOP
    SELECT count(*) INTO junk FROM demo_orders WHERE status = 'paid';
    SELECT count(*) INTO junk FROM demo_clicks WHERE user_id = (i % 3000) + 1;
    SELECT count(*) INTO junk FROM demo_events WHERE kind = 'purchase';
  END LOOP;
END $$;

-- ============================================================================
-- RECORD SLOW QUERIES  (slow_query: mean_exec_time > 500ms)
--   These run at TOP LEVEL so pg_stat_statements records them. Each is slow
--   on purpose (unindexed join + sort, or a deliberate sleep).
-- ============================================================================

-- Slow #1: unindexed self-ish join across two big tables + sort.
SELECT o.status, count(*) AS n, sum(length(c.url)) AS junk
FROM demo_orders o
JOIN demo_clicks c ON c.user_id = o.customer_id
GROUP BY o.status
ORDER BY n DESC;

-- Slow #2: cross-ish aggregate forcing a full scan + hash.
SELECT e.kind, count(DISTINCT o.customer_id) AS customers
FROM demo_events e
JOIN demo_orders o ON o.status = e.kind
GROUP BY e.kind;

-- Slow #3 & #4: explicit sleeps so at least two clear slow_query rows exist.
SELECT pg_sleep(0.7);
SELECT pg_sleep(0.9), count(*) FROM demo_clicks WHERE url LIKE '/page/1%';

-- Nudge the stats collector so n_dead_tup / seq_scan are visible immediately.
ANALYZE demo_logs;
ANALYZE demo_sessions;
ANALYZE demo_orders;
ANALYZE demo_clicks;
ANALYZE demo_events;

-- ============================================================================
-- VERIFY (optional) — what the scanner will see:
-- ============================================================================
-- Bloat:
--   SELECT relname, n_live_tup, n_dead_tup,
--          round(n_dead_tup::numeric/nullif(n_live_tup+n_dead_tup,0)*100,1) AS bloat_pct
--   FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY bloat_pct DESC;
-- Seq scans:
--   SELECT relname, seq_scan, idx_scan, n_live_tup
--   FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY seq_scan DESC;
-- Slow queries:
--   SELECT round(mean_exec_time::numeric,1) AS mean_ms, calls, left(query,60)
--   FROM pg_stat_statements WHERE mean_exec_time > 500 ORDER BY mean_exec_time DESC;
-- ============================================================================
