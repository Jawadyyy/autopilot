-- ============================================================================
-- DB Autopilot — PostgreSQL OLTP Core Schema
-- ============================================================================
-- This is the app's PRIMARY database (the one POSTGRES_* in .env.local points
-- at). The databases you "connect" in the UI are *external* targets that this
-- schema only stores metadata about — it never modifies them.
--
-- Run once against your primary Postgres (e.g. your Supabase project):
--   psql "$DATABASE_URL" -f db/schema.sql
-- or paste it into the Supabase SQL editor.
--
-- Idempotent: safe to re-run. Tables use IF NOT EXISTS; views/procs use
-- CREATE OR REPLACE. It will NOT drop existing data.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypt(), gen_salt()

-- ──────────────────────────────────────────────────────────────────────────
-- Users & roles (Week 14 — security)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'db_viewer'
                  CHECK (role IN ('db_viewer', 'db_operator', 'db_admin')),
  is_active     boolean NOT NULL DEFAULT TRUE,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Monitored external databases (Screen 3 — connection manager)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitored_connections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  host               text NOT NULL,
  port               integer NOT NULL,
  db_name            text NOT NULL,
  username           text NOT NULL,
  password_encrypted text NOT NULL,            -- AES-256-CBC, see lib/utils/crypto.ts
  db_type            text NOT NULL CHECK (db_type IN ('postgresql', 'mssql')),
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'paused', 'error')),
  added_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  last_checked_at    timestamptz,
  last_error         text,
  created_at         timestamptz NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Detected issues (Screen 4 — live health feed)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detected_issues (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    uuid REFERENCES monitored_connections(id) ON DELETE CASCADE,
  issue_type       text NOT NULL,
  severity         text NOT NULL DEFAULT 'info'
                     CHECK (severity IN ('critical','high','warning','medium','info','low')),
  title            text NOT NULL,
  description      text,
  affected_table   text,
  affected_query   text,
  is_resolved      boolean NOT NULL DEFAULT FALSE,
  resolved_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes text,
  source           text NOT NULL DEFAULT 'manual',   -- 'scan' | 'manual'
  fingerprint      text,                              -- stable key for scan dedupe
  detected_at      timestamptz NOT NULL DEFAULT NOW(),
  resolved_at      timestamptz
);

-- Backfill columns on databases created before this revision (idempotent)
ALTER TABLE detected_issues ADD COLUMN IF NOT EXISTS source      text NOT NULL DEFAULT 'manual';
ALTER TABLE detected_issues ADD COLUMN IF NOT EXISTS fingerprint text;

-- One open issue per (connection, fingerprint) so re-scans update rather than duplicate
CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_open_fingerprint
  ON detected_issues (connection_id, fingerprint)
  WHERE is_resolved = FALSE AND fingerprint IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- Autopilot rules engine (Screen 7)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autopilot_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  issue_type          text NOT NULL,
  trigger_condition   text NOT NULL,
  action_sql_template text,
  action_description  text NOT NULL,
  mode                text NOT NULL DEFAULT 'suggest'
                        CHECK (mode IN ('auto', 'suggest', 'off')),
  is_active           boolean NOT NULL DEFAULT TRUE,
  created_at          timestamptz NOT NULL DEFAULT NOW()
);

-- Every fix applied or suggested by the autopilot
CREATE TABLE IF NOT EXISTS autopilot_actions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      uuid REFERENCES detected_issues(id) ON DELETE CASCADE,
  rule_id       uuid REFERENCES autopilot_rules(id) ON DELETE SET NULL,
  action_type   text NOT NULL,
  sql_applied   text,
  status        text NOT NULL DEFAULT 'applied'
                  CHECK (status IN ('applied', 'failed', 'suggested', 'dismissed')),
  outcome_notes text,
  applied_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  applied_at    timestamptz NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Query plans as JSONB (Screen 5 / Week 13 — NoSQL JSON)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id  uuid REFERENCES monitored_connections(id) ON DELETE CASCADE,
  query_hash     text,
  query_text     text NOT NULL,
  plan_json      jsonb,
  plan_type      text NOT NULL DEFAULT 'before_fix'
                   CHECK (plan_type IN ('before_fix', 'after_fix')),
  total_cost     numeric,
  execution_ms   numeric,
  rows_examined  bigint,
  has_seq_scan   boolean DEFAULT FALSE,
  has_index_scan boolean DEFAULT FALSE,
  related_issue  uuid REFERENCES detected_issues(id) ON DELETE SET NULL,
  captured_at    timestamptz NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────
-- Backup history (Screen 9 / Week 10 — recovery)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backup_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES monitored_connections(id) ON DELETE CASCADE,
  backup_path   text,
  status        text NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'success', 'failed')),
  size_mb       numeric,
  wal_lsn       text,
  error_message text,
  started_at    timestamptz NOT NULL DEFAULT NOW(),
  completed_at  timestamptz
);

-- ──────────────────────────────────────────────────────────────────────────
-- Audit log (Week 4 — triggers)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation  text NOT NULL,
  record_id  text,
  old_data   jsonb,
  new_data   jsonb,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes (Week 5 — B-tree, partial, composite, GIN)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_issues_conn_sev_time
  ON detected_issues (connection_id, severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_unresolved
  ON detected_issues (detected_at DESC) WHERE is_resolved = FALSE;          -- partial
CREATE INDEX IF NOT EXISTS idx_plans_connection ON query_plans (connection_id);
CREATE INDEX IF NOT EXISTS idx_plans_seqscan
  ON query_plans (execution_ms DESC) WHERE has_seq_scan = TRUE;             -- partial
CREATE INDEX IF NOT EXISTS idx_plans_json ON query_plans USING GIN (plan_json); -- JSONB
CREATE INDEX IF NOT EXISTS idx_actions_issue ON autopilot_actions (issue_id);
CREATE INDEX IF NOT EXISTS idx_actions_rule  ON autopilot_actions (rule_id);
CREATE INDEX IF NOT EXISTS idx_backup_conn   ON backup_history (connection_id, started_at DESC);

-- ============================================================================
-- Stored procedures & functions (Week 3 / Week 7 — procs + transactions)
-- ============================================================================

-- Log a newly detected issue.
CREATE OR REPLACE PROCEDURE sp_log_issue(
  p_connection_id uuid,
  p_issue_type    text,
  p_severity      text,
  p_title         text,
  p_description   text
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO detected_issues (connection_id, issue_type, severity, title, description)
  VALUES (p_connection_id, p_issue_type, p_severity, p_title, p_description);
END;
$$;

-- Mark an issue as resolved / dismissed.
CREATE OR REPLACE PROCEDURE sp_resolve_issue(
  p_issue_id uuid,
  p_user_id  uuid,
  p_notes    text
) LANGUAGE plpgsql AS $$
BEGIN
  UPDATE detected_issues
     SET is_resolved      = TRUE,
         resolved_at      = NOW(),
         resolved_by      = p_user_id,
         resolution_notes = p_notes
   WHERE id = p_issue_id;
END;
$$;

-- Record an applied fix and resolve its issue, atomically (Week 7).
CREATE OR REPLACE PROCEDURE sp_apply_fix(
  p_issue_id    uuid,
  p_rule_id     uuid,
  p_action_type text,
  p_sql_to_run  text,
  p_user_id     uuid
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO autopilot_actions
    (issue_id, rule_id, action_type, sql_applied, status, applied_by, applied_at)
  VALUES
    (p_issue_id, p_rule_id, p_action_type, p_sql_to_run, 'applied', p_user_id, NOW());

  UPDATE detected_issues
     SET is_resolved      = TRUE,
         resolved_at      = NOW(),
         resolved_by      = p_user_id,
         resolution_notes = 'Auto-fixed: ' || p_action_type
   WHERE id = p_issue_id;
END;
$$;

-- Compute a 0-100 health score for a connection from its unresolved issues.
CREATE OR REPLACE FUNCTION fn_compute_health_score(p_connection_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_critical int;
  v_warning  int;
  v_info     int;
  v_score    int;
BEGIN
  SELECT COUNT(*) FILTER (WHERE severity IN ('critical','high')),
         COUNT(*) FILTER (WHERE severity IN ('warning','medium')),
         COUNT(*) FILTER (WHERE severity IN ('info','low'))
    INTO v_critical, v_warning, v_info
    FROM detected_issues
   WHERE connection_id = p_connection_id AND is_resolved = FALSE;

  v_score := 100 - (v_critical * 15) - (v_warning * 5) - (v_info * 1);
  RETURN GREATEST(v_score, 0);
END;
$$;

-- ============================================================================
-- Triggers (Week 4 — audit captured automatically on change)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_audit_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id::text, to_jsonb(OLD), current_user);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), current_user);
    RETURN NEW;
  ELSE
    INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id::text, to_jsonb(NEW), current_user);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_connections ON monitored_connections;
CREATE TRIGGER trg_audit_connections
  AFTER INSERT OR UPDATE OR DELETE ON monitored_connections
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

DROP TRIGGER IF EXISTS trg_audit_rules ON autopilot_rules;
CREATE TRIGGER trg_audit_rules
  AFTER INSERT OR UPDATE OR DELETE ON autopilot_rules
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

-- ============================================================================
-- Views (Week 2 — joins/aggregates used by the API)
-- ============================================================================
CREATE OR REPLACE VIEW v_connection_health AS
SELECT c.id            AS connection_id,
       c.name,
       c.db_type,
       c.status,
       c.last_checked_at,
       COUNT(i.id) FILTER (WHERE i.is_resolved = FALSE)                         AS open_issues,
       COUNT(i.id) FILTER (WHERE i.severity = 'critical' AND i.is_resolved = FALSE) AS critical_issues,
       fn_compute_health_score(c.id)                                            AS health_score
  FROM monitored_connections c
  LEFT JOIN detected_issues i ON i.connection_id = c.id
 GROUP BY c.id;

CREATE OR REPLACE VIEW v_action_log AS
SELECT a.id,
       a.action_type,
       a.status,
       a.applied_at,
       a.outcome_notes,
       a.sql_applied,
       i.issue_type,
       i.severity,
       i.affected_table,
       c.name AS connection_name,
       r.name AS rule_name
  FROM autopilot_actions a
  LEFT JOIN detected_issues       i ON i.id = a.issue_id
  LEFT JOIN monitored_connections c ON c.id = i.connection_id
  LEFT JOIN autopilot_rules       r ON r.id = a.rule_id
 ORDER BY a.applied_at DESC;

CREATE OR REPLACE VIEW v_rule_effectiveness AS
SELECT r.id AS rule_id,
       r.name,
       r.issue_type,
       r.mode,
       r.is_active,
       COUNT(a.id)                                          AS total_actions,
       COUNT(a.id) FILTER (WHERE a.status = 'applied')      AS applied_count,
       COUNT(a.id) FILTER (WHERE a.status = 'failed')       AS failed_count,
       ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status = 'applied')
             / NULLIF(COUNT(a.id), 0), 2)                   AS success_rate
  FROM autopilot_rules r
  LEFT JOIN autopilot_actions a ON a.rule_id = r.id
 GROUP BY r.id;

CREATE OR REPLACE VIEW v_performance_trend_24h AS
SELECT connection_id,
       date_trunc('hour', detected_at)                      AS hour,
       COUNT(*)                                             AS issue_count,
       COUNT(*) FILTER (WHERE severity = 'critical')        AS critical_count,
       COUNT(*) FILTER (WHERE is_resolved)                  AS resolved_count
  FROM detected_issues
 WHERE detected_at >= NOW() - INTERVAL '24 hours'
 GROUP BY connection_id, date_trunc('hour', detected_at)
 ORDER BY hour;

-- ============================================================================
-- Row-Level Security demo (Week 14)
-- ----------------------------------------------------------------------------
-- Enabled to demonstrate RLS. The app connects as the table owner/superuser,
-- which bypasses RLS, so this permissive policy never blocks the application —
-- it's here to show the mechanism and as a base to tighten per-connection.
-- ============================================================================
ALTER TABLE detected_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_issues_visibility ON detected_issues;
CREATE POLICY p_issues_visibility ON detected_issues
  USING (true) WITH CHECK (true);

-- ============================================================================
-- Seed data
-- ============================================================================
-- Default admin login —  username: admin   password: admin123
-- (bcrypt hash via pgcrypto; verifiable by bcryptjs in lib/auth/jwt.ts)
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@dbautopilot.local', crypt('admin123', gen_salt('bf', 12)), 'db_admin')
ON CONFLICT (username) DO NOTHING;

-- A few starter autopilot rules so Screen 7 isn't empty
INSERT INTO autopilot_rules (name, issue_type, trigger_condition, action_description, mode)
SELECT * FROM (VALUES
  ('Index sequential scans', 'missing_index', 'Seq Scan on table > 10k rows',     'CREATE INDEX on the scanned column', 'suggest'),
  ('Vacuum bloated tables',  'table_bloat',   'Dead tuples > 20% of live tuples',  'Run VACUUM ANALYZE on the table',    'auto'),
  ('Flag slow queries',      'slow_query',    'mean_exec_time > 1000 ms',          'Capture EXPLAIN ANALYZE for review', 'suggest')
) AS v(name, issue_type, trigger_condition, action_description, mode)
WHERE NOT EXISTS (SELECT 1 FROM autopilot_rules);

-- ============================================================================
-- Done. Verify with:  SELECT username, role FROM users;
-- ============================================================================
