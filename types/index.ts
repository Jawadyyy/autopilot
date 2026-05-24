export type DbType       = 'postgresql' | 'mssql'
export type ConnStatus   = 'active' | 'error' | 'paused' | 'untested'
export type IssueType    = 'slow_query' | 'missing_index' | 'deadlock' | 'table_bloat' | 'idle_connections' | 'lock_contention' | 'long_transaction' | 'unused_index'
export type Severity     = 'low' | 'medium' | 'high' | 'critical'
export type FixMode      = 'auto' | 'suggest' | 'off'
export type ActionStatus = 'pending' | 'applied' | 'failed' | 'rolled_back' | 'dismissed'
export type BackupStatus = 'running' | 'success' | 'failed'
export type UserRole     = 'db_viewer' | 'db_operator' | 'db_admin'

export interface MonitoredConnection {
  id:              string
  name:            string
  host:            string
  port:            number
  db_name:         string
  username:        string
  db_type:         DbType
  status:          ConnStatus
  last_checked_at: string | null
  last_error:      string | null
  created_at:      string
}

export interface DetectedIssue {
  id:             string
  connection_id:  string
  db_name?:       string
  issue_type:     IssueType
  severity:       Severity
  title:          string
  description:    string
  affected_table: string | null
  affected_query: string | null
  raw_data:       Record<string, any> | null
  is_resolved:    boolean
  resolved_at:    string | null
  detected_at:    string
}

export interface AutopilotRule {
  id:                  string
  name:                string
  issue_type:          IssueType
  trigger_condition:   string
  action_sql_template: string | null
  action_description:  string
  mode:                FixMode
  is_active:           boolean
  success_count:       number
  fail_count:          number
}

export interface AutopilotAction {
  id:            string
  issue_id:      string
  rule_id:       string | null
  action_type:   string
  sql_applied:   string | null
  status:        ActionStatus
  outcome_notes: string | null
  applied_by:    string | null
  applied_at:    string
  completed_at:  string | null
}

export interface QueryPlan {
  id:             string
  connection_id:  string
  query_hash:     string
  query_text:     string
  plan_json:      Record<string, any>
  plan_type:      'before_fix' | 'after_fix'
  total_cost:     number | null
  execution_ms:   number | null
  has_seq_scan:   boolean
  has_index_scan: boolean
  related_issue:  string | null
  captured_at:    string
}

export interface PerformanceMetric {
  id:                 string
  connection_id:      string
  avg_query_ms:       number
  slow_query_count:   number
  cache_hit_ratio:    number
  active_connections: number
  idle_connections:   number
  deadlock_count:     number
  tps:                number
  health_score:       number
  recorded_at:        string
}

export interface BackupRecord {
  id:            string
  connection_id: string
  backup_path:   string | null
  size_mb:       number | null
  status:        BackupStatus
  error_message: string | null
  wal_lsn:       string | null
  started_at:    string
  completed_at:  string | null
}

export interface User {
  id:            string
  username:      string
  email:         string
  role:          UserRole
  is_active:     boolean
  created_at:    string
  last_login_at: string | null
}

export interface WsEvent {
  type:      'new_issue' | 'issue_resolved' | 'action_applied' | 'metrics_update' | 'connection_status'
  payload:   any
  timestamp: string
}