export type DbType       = 'postgresql' | 'mssql'
export type ConnStatus   = 'connected' | 'disconnected' | 'error' | 'paused'
export type IssueType    = 'slow_query' | 'missing_index' | 'deadlock' | 'table_bloat' | 'idle_connections' | 'lock_contention' | 'long_transaction' | 'unused_index'
export type Severity     = 'info' | 'warning' | 'critical'
export type FixMode      = 'auto' | 'suggest' | 'off'
export type ActionStatus = 'pending' | 'applied' | 'failed' | 'rolled_back' | 'dismissed'
export type BackupStatus = 'running' | 'success' | 'failed'
export type UserRole     = 'db_viewer' | 'db_operator' | 'db_admin'
export type LockState    = 'active' | 'blocker' | 'waiting' | 'idle'

export interface Cluster {
  id:              string
  name:            string
  region:          string
  status:          'healthy' | 'critical' | 'warning'
  active_sessions: number
  uptime:          string
  query_latency:   string
  connections:     string[]
}

export interface MonitoredConnection {
  id:              string
  name:            string
  type:            DbType
  host:            string
  port:            number
  db_name:         string
  username:        string
  status:          ConnStatus
  last_checked_at: string
  version:         string
  created_at:      string
  cluster_id:      string
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
  cluster_id:     string
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
  scope:               string
  status:              'active' | 'inactive'
}

export interface HealthEvent {
  id:              string
  timestamp:       string
  cluster_id:      string
  severity:        Severity
  type:            string
  title:           string
  description:     string
  query_snippet?:  string
  table_name?:     string
  metric_value?:   number
  status:          'active' | 'resolved'
}

export interface QueryPlan {
  id:              string
  query_hash:      string
  query_text:      string
  plan_type:       'current' | 'optimized'
  cost:            number
  execution_time:  number
  rows:            number
  plan_json:       Record<string, any>
  created_at:      string
}

export interface Lock {
  id?:             string
  pid:             number
  query_snippet:   string
  duration:        string
  state:           LockState
  duration_ms:     number
  blocker_pid?:    number
}

export interface BackupRecord {
  id:              string
  timestamp:       string
  type:            string
  size:            string
  duration:        string
  status:          BackupStatus
  storage:         string
}

export interface Table {
  name:            string
  row_count:       number
  size_mb:         number
  bloat_ratio:     number
  dead_tuples:     number
  last_vacuum:     string
}

export interface SchemaAnalysis {
  total_bloat:     string
  dead_tuples:     number
  index_coverage:  number
  vacuum_health:   string
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