import type { Cluster, MonitoredConnection, DetectedIssue, HealthEvent, Lock, BackupRecord, Table, AutopilotRule, QueryPlan } from '@/types'

export const CLUSTERS: Cluster[] = [
  {
    id: 'prod-cluster-01',
    name: 'Production-Postgres',
    region: 'us-east-1',
    status: 'healthy',
    active_sessions: 412,
    uptime: '99.98%',
    query_latency: '12ms',
    connections: ['prod-customer-db', 'prod-analytics', 'prod-reports']
  },
  {
    id: 'analytics-cluster-01',
    name: 'Analytics-MSSQL',
    region: 'eu-west-2',
    status: 'critical',
    active_sessions: 1842,
    uptime: '94.12%',
    query_latency: '245ms',
    connections: ['stg-analytics-mssql']
  },
  {
    id: 'staging-cluster-01',
    name: 'Staging-Postgres',
    region: 'us-west-2',
    status: 'healthy',
    active_sessions: 12,
    uptime: '100%',
    query_latency: '8ms',
    connections: ['stg-postgres-main']
  }
]

export const CONNECTIONS: MonitoredConnection[] = [
  {
    id: 'conn-1',
    name: 'prod-customer-db',
    type: 'postgresql',
    host: 'pp-prod-01.aws.internal',
    port: 5432,
    db_name: 'customers',
    username: 'app_user',
    status: 'connected',
    last_checked_at: new Date(Date.now() - 2 * 60000).toISOString(),
    version: 'v15.4',
    created_at: '2023-01-15T10:00:00Z',
    cluster_id: 'prod-cluster-01'
  },
  {
    id: 'conn-2',
    name: 'stg-analytics-mssql',
    type: 'mssql',
    host: 'ms-stg-node.internal',
    port: 1433,
    db_name: 'analytics_db',
    username: 'sql_admin',
    status: 'connected',
    last_checked_at: new Date(Date.now() - 15 * 60000).toISOString(),
    version: '2019',
    created_at: '2023-02-20T14:30:00Z',
    cluster_id: 'analytics-cluster-01'
  },
  {
    id: 'conn-3',
    name: 'prod-analytics',
    type: 'postgresql',
    host: 'pp-prod-02.aws.internal',
    port: 5432,
    db_name: 'analytics',
    username: 'analytics_user',
    status: 'connected',
    last_checked_at: new Date(Date.now() - 5 * 60000).toISOString(),
    version: 'v15.4',
    created_at: '2023-03-10T08:45:00Z',
    cluster_id: 'prod-cluster-01'
  }
]

export const HEALTH_EVENTS: HealthEvent[] = [
  {
    id: 'evt-1',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    cluster_id: 'prod-cluster-01',
    severity: 'critical',
    type: 'deadlock',
    title: 'Deadlock Detected',
    description: 'A circular dependency exists between PIDs 402, 405, and 410.',
    table_name: 'orders',
    status: 'active'
  },
  {
    id: 'evt-2',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    cluster_id: 'analytics-cluster-01',
    severity: 'warning',
    type: 'slow_query',
    title: 'Slow Query Threshold Exceeded',
    description: 'Query execution time exceeded 500ms',
    query_snippet: 'SELECT * FROM transactions WHERE date_range...',
    metric_value: 742,
    status: 'active'
  },
  {
    id: 'evt-3',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    cluster_id: 'prod-cluster-01',
    severity: 'warning',
    type: 'table_bloat',
    title: 'Table Bloat Detected',
    description: 'event_logs has 42.5% bloat ratio and 1.2GB wasted space',
    table_name: 'event_logs',
    metric_value: 42.5,
    status: 'active'
  },
  {
    id: 'evt-4',
    timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
    cluster_id: 'prod-customer-db',
    severity: 'info',
    type: 'connection_pool',
    title: 'Connection Pool Exhaustion',
    description: 'Auth service DB is experiencing connection pool issues. 12 successful login attempts from internal subnet.',
    status: 'resolved'
  },
  {
    id: 'evt-5',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    cluster_id: 'prod-cluster-01',
    severity: 'warning',
    type: 'index_cache',
    title: 'Buffer Cache Hit Ratio Drop',
    description: 'Reporting DB observed 18% drop in buffer cache hit ratio over last hour',
    metric_value: 18,
    status: 'active'
  }
]

export const LOCKS: Lock[] = [
  {
    pid: 402,
    query_snippet: 'UPDATE accounts SET balance = balance...',
    duration: '12m',
    duration_ms: 720000,
    state: 'blocker',
    blocker_pid: 405
  },
  {
    id: '405',
    pid: 405,
    query_snippet: 'SELECT * FROM orders JOIN accounts WHERE...',
    duration: '4s',
    duration_ms: 4000,
    state: 'waiting',
    blocker_pid: 402
  },
  {
    pid: 512,
    query_snippet: 'SELECT 1;',
    duration: '8s',
    duration_ms: 8000,
    state: 'idle'
  },
  {
    pid: 622,
    query_snippet: 'INSERT INTO logs (msg, ts) VALUES (...',
    duration: '2s',
    duration_ms: 2000,
    state: 'active'
  }
]

export const AUTOPILOT_RULES: AutopilotRule[] = [
  {
    id: 'rule-1',
    name: 'Create Index on Sequential Scan',
    issue_type: 'missing_index',
    trigger_condition: 'Seq Scan > 1M rows',
    action_description: 'Create Index',
    mode: 'auto',
    is_active: true,
    success_count: 128,
    fail_count: 3,
    scope: 'production-cl-01',
    status: 'active'
  },
  {
    id: 'rule-2',
    name: 'Auto-Scale Cluster',
    issue_type: 'idle_connections',
    trigger_condition: 'CPU Usage > 85% for 5m',
    action_description: 'Scale Cluster',
    mode: 'suggest',
    is_active: true,
    success_count: 42,
    fail_count: 0,
    scope: 'Global',
    status: 'active'
  },
  {
    id: 'rule-3',
    name: 'Trigger Auto-Vacuum',
    issue_type: 'table_bloat',
    trigger_condition: 'Dead Tuples > 20%',
    action_description: 'Execute VACUUM ANALYZE',
    mode: 'auto',
    is_active: true,
    success_count: 215,
    fail_count: 12,
    scope: 'analytics-uis-04',
    status: 'active'
  }
]

export const BACKUP_HISTORY: BackupRecord[] = [
  {
    id: 'bak-1',
    timestamp: '2023-11-24 08:00:01',
    type: 'FULL',
    size: '42.8 GB',
    duration: '12m 44s',
    status: 'success',
    storage: 'AWS S3 (us-east-1)'
  },
  {
    id: 'bak-2',
    timestamp: '2023-11-23 08:00:02',
    type: 'FULL',
    size: '41.2 GB',
    duration: '11m 02s',
    status: 'success',
    storage: 'AWS S3 (us-east-1)'
  },
  {
    id: 'bak-3',
    timestamp: '2023-11-22 08:00:01',
    type: 'FULL',
    size: '39.5 GB',
    duration: '10m 55s',
    status: 'success',
    storage: 'AWS S3 (us-east-1)'
  }
]

export const SCHEMA_TABLES: Table[] = [
  {
    name: 'transactions',
    row_count: 12450293,
    size_mb: 2400,
    bloat_ratio: 34.2,
    dead_tuples: 4210804,
    last_vacuum: '2023-11-24 03:15:00'
  },
  {
    name: 'users',
    row_count: 1204550,
    size_mb: 145,
    bloat_ratio: 2.1,
    dead_tuples: 12400,
    last_vacuum: '2023-11-23 15:30:00'
  },
  {
    name: 'order_items',
    row_count: 45002110,
    size_mb: 840,
    bloat_ratio: 18.5,
    dead_tuples: 840290,
    last_vacuum: '2023-11-22 09:45:00'
  },
  {
    name: 'inventory',
    row_count: 4580,
    size_mb: 1,
    bloat_ratio: 0.4,
    dead_tuples: 120,
    last_vacuum: '2023-11-24 18:20:00'
  },
  {
    name: 'audit_events',
    row_count: 126580880,
    size_mb: 2400431,
    bloat_ratio: 12.8,
    dead_tuples: 2580431,
    last_vacuum: '2023-11-20 14:15:00'
  }
]

export const QUERY_PLANS: QueryPlan[] = [
  {
    id: 'plan-1',
    query_hash: '0xAF8230',
    query_text: 'SELECT u.display_name, o.order_id, o.total_amount FROM users u JOIN orders o ON u.user_id = o.owner_id WHERE o.status = \'completed\' AND o.created_at > NOW() - INTERVAL \'24 hours\' ORDER BY o.total_amount DESC;',
    plan_type: 'current',
    cost: 45201.22,
    execution_time: 850,
    rows: 42881,
    plan_json: {
      'Plan Type': 'Seq Scan',
      'Total Amount DESC': 'Sort',
      'Bottleneck': 'No Index'
    },
    created_at: '2023-11-24T12:00:00Z'
  },
  {
    id: 'plan-2',
    query_hash: '0xAF8230',
    query_text: 'SELECT u.display_name, o.order_id, o.total_amount FROM users u JOIN orders o ON u.user_id = o.owner_id WHERE o.status = \'completed\' AND o.created_at > NOW() - INTERVAL \'24 hours\' ORDER BY o.total_amount DESC;',
    plan_type: 'optimized',
    cost: 142.10,
    execution_time: 12,
    rows: 42881,
    plan_json: {
      'Plan Type': 'Index Scan',
      'Index Name': 'idx_orders_status_date',
      'Sort': 'Index Only Scan'
    },
    created_at: '2023-11-24T12:00:00Z'
  }
]
