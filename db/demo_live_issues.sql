-- ============================================================================
-- DB Autopilot — DEMO "LIVE SESSION" ISSUES
-- ============================================================================
-- These three issue types only exist while a session is HELD OPEN, so the
-- Supabase SQL Editor (auto-commits every run) can't produce them. Use psql.
--
-- Connect with the SAME Session-Pooler creds you put in the app:
--   psql "postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"
--
-- Run the snippet you want, LEAVE the psql window open, then hit Scan in the app.
-- ============================================================================


-- ── A) LONG-RUNNING TRANSACTION  (long_transaction: open xact > 60s) ─────────
-- Paste this, then just wait. After ~60s a scan flags it. Type ROLLBACK; later.
--
--   BEGIN;
--   UPDATE demo_orders SET status = status WHERE id = 1;
--   -- ...now do nothing. Leave it. Run a scan after a minute.
--   -- ROLLBACK;   -- run this when done


-- ── B) IDLE IN TRANSACTION  (idle_in_transaction) ────────────────────────────
-- Same idea — open a tx, touch a row, then sit idle. The session state becomes
-- 'idle in transaction'. A scan flags it immediately (no 60s wait).
--
--   BEGIN;
--   SELECT * FROM demo_sessions LIMIT 1;
--   -- leave the prompt sitting here, idle, inside the open transaction
--   -- COMMIT;   -- run this when done


-- ── C) LOCK CONTENTION  (lock_contention: critical) ──────────────────────────
-- Needs TWO psql windows. Window 1 grabs a row lock and holds it; Window 2
-- waits on the same row. A scan sees the blocked/blocking pair (CRITICAL).
--
--   -- WINDOW 1 (the blocker — run, then leave open):
--   BEGIN;
--   UPDATE demo_orders SET status = 'paid' WHERE id = 1;
--   -- do NOT commit yet
--
--   -- WINDOW 2 (the victim — run, it will HANG, which is the point):
--   BEGIN;
--   UPDATE demo_orders SET status = 'shipped' WHERE id = 1;   -- blocks here
--
--   -- Now run a scan in the app → lock_contention appears.
--   -- Release: COMMIT; in Window 1, then COMMIT; in Window 2.
-- ============================================================================
