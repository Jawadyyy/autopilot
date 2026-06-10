const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  TableOfContents, PageBreak, Footer, PageNumber,
} = require('docx')

const OUT = 'J:\\Work\\db-autopilot\\DB Autopilot - Project Report.docx'
const CW = 9360 // content width (US Letter, 1" margins)
const BLUE = '2F6BFF', DARK = '0F172A', HEAD = 'D5E1FF', ZEBRA = 'EEF2FF'

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const borders = { top: border, left: border, bottom: border, right: border }

// ---- helpers ----
const T = (text, opts = {}) => new TextRun({ text, ...opts })
const P = (text, opts = {}) => new Paragraph({ children: [T(text)], spacing: { after: 120 }, ...opts })
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [T(text)] })
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T(text)] })
const bullet = (text) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60 }, children: [T(text)] })
const num = (text) => new Paragraph({ numbering: { reference: 'n', level: 0 }, spacing: { after: 60 }, children: [T(text)] })
const blank = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [T('')] }))
const placeholder = (text) => new Table({
  width: { size: CW, type: WidthType.DXA },
  columnWidths: [CW],
  rows: [new TableRow({ children: [new TableCell({
    borders,
    width: { size: CW, type: WidthType.DXA },
    shading: { fill: 'FAFBFF', type: ShadingType.CLEAR },
    margins: { top: 240, bottom: 240, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, italics: true, color: '888888' })] }),
      new Paragraph({ children: [new TextRun({ text: '' })] }),
      new Paragraph({ children: [new TextRun({ text: '' })] }),
    ],
  })] })],
})

function cell(text, { bold = false, header = false, w } = {}) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: header ? HEAD : 'FFFFFF', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: bold || header })] })],
  })
}
function table(headerRow, rows, widths) {
  const trh = new TableRow({
    tableHeader: true,
    children: headerRow.map((h, i) => cell(h, { header: true, w: widths[i] })),
  })
  const trs = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: ri % 2 ? ZEBRA : 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: c })] })],
    })),
  }))
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: [trh, ...trs] })
}

const children = []

// ---- TITLE PAGE ----
children.push(...blank(4))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
  children: [new TextRun({ text: 'DB Autopilot', bold: true, size: 64, color: DARK })] }))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
  children: [new TextRun({ text: 'Autonomous Database Monitoring & Self-Healing Platform', size: 30, color: BLUE })] }))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
  children: [new TextRun({ text: 'Advanced Database Management Systems (ADBMS) — Project Report', size: 24, color: '475569' })] }))
children.push(...blank(8))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Name: ____________________________', size: 24 })] }))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Roll No / ID: ____________________________', size: 24 })] }))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Course / Section: ____________________________', size: 24 })] }))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Instructor: ____________________________', size: 24 })] }))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Date: ____________________________', size: 24 })] }))
children.push(new Paragraph({ children: [new PageBreak()] }))

// ---- TOC ----
children.push(new Paragraph({ children: [new TextRun({ text: 'Table of Contents', bold: true, size: 32, color: DARK })], spacing: { after: 160 } }))
children.push(new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }))
children.push(new Paragraph({ children: [new PageBreak()] }))

// ---- 1. INTRODUCTION ----
children.push(H1('1. Introduction'))
children.push(P('DB Autopilot is a web-based platform that continuously monitors databases, detects problems inside them, and either suggests or automatically applies a fix. It behaves like a "doctor" for databases: it reads the database’s own internal statistics (its system catalogs), diagnoses issues such as slow queries, missing indexes, wasted storage (table bloat) and lock contention, presents a 0–100 health score, and can run the remediation directly on the target database.'))
children.push(P('The system is built as a single full-stack application using Next.js 16 (App Router) and React 19 on the front end, with server-side API routes that securely connect to the databases. The application’s own data lives in a PostgreSQL database (hosted on Supabase) which acts as the OLTP (Online Transaction Processing) store. Historical issue data is additionally loaded into a Microsoft SQL Server star-schema warehouse for OLAP (Online Analytical Processing) reporting.'))
children.push(P('The project deliberately uses multiple databases to demonstrate a wide range of Advanced Database Management System concepts in a single, realistic scenario — an application database (the brain), one or more monitored target databases (the patients), and an analytical data warehouse.'))
children.push(H2('1.1 Databases Used'))
children.push(table(
  ['Database', 'Type', 'Role in the project'],
  [
    ['Application DB (PostgreSQL / Supabase)', 'OLTP', 'Stores users, monitored-connection records, detected issues, automation rules, applied fixes, query plans, backup history and an audit log. All core relational concepts are implemented here.'],
    ['Monitored target DB(s) (PostgreSQL)', 'External target', 'Databases that the platform connects to and diagnoses. A dedicated demo database is intentionally filled with problems to showcase detection and fixing.'],
    ['Data Warehouse (Microsoft SQL Server)', 'OLAP', 'A star schema (fact + dimension tables) loaded by an ETL process for analytics such as trends, heatmaps and CUBE pivots.'],
  ],
  [2600, 1400, 5360]
))

// ---- 2. SCOPE ----
children.push(H1('2. Scope'))
children.push(P('The scope of DB Autopilot covers the end-to-end lifecycle of database health management — connecting to databases, detecting issues, remediating them, and analysing the history of incidents.'))
children.push(H2('2.1 In Scope'))
children.push(bullet('Secure management of multiple monitored database connections (add, test, pause, delete), with stored credentials encrypted at rest.'))
children.push(bullet('Live, read-only scanning of PostgreSQL targets for: table bloat, missing indexes, slow queries, long-running transactions, idle-in-transaction sessions, lock contention / blocking, and low buffer cache hit ratio.'))
children.push(bullet('Advisory scanning of Microsoft SQL Server targets via dynamic management views (DMVs).'))
children.push(bullet('A health-scoring engine that produces a 0–100 score per database from open issues weighted by severity.'))
children.push(bullet('An autopilot rules engine that can run safe fixes automatically (e.g. VACUUM) or only suggest them.'))
children.push(bullet('One-click remediation: applying an executable SQL fix to the target database and resolving the issue.'))
children.push(bullet('Capture of real query execution plans (stored as JSONB) for before/after comparison.'))
children.push(bullet('A schema-graph view of a target’s tables, columns and foreign-key relationships.'))
children.push(bullet('An OLAP module: a star-schema warehouse, an ETL pipeline, and multi-dimensional CUBE/ROLLUP analytics (heatmaps, trends, pivots).'))
children.push(bullet('Security: JWT-based authentication, bcrypt password hashing, AES-256 encryption of monitored-DB passwords, role-based access control and row-level security.'))
children.push(bullet('Real-time dashboard updates via Server-Sent Events, automatic audit logging, and interactive Swagger API documentation.'))
children.push(H2('2.2 Out of Scope'))
children.push(bullet('Modifying or storing the business data of monitored databases — the platform only reads system catalogs and applies maintenance fixes.'))
children.push(bullet('Unattended execution of destructive operations (e.g. terminating sessions) — these remain manual.'))
children.push(bullet('Support for non-relational/NoSQL target engines (only PostgreSQL and SQL Server targets are supported).'))

// ---- 3. FUNCTIONALITIES ----
children.push(H1('3. Functionalities'))
children.push(P('The application is organised into focused screens, each backed by a server-side API route. The main functionalities are:'))
children.push(num('Authentication & access control — users log in and receive a signed JWT; actions are gated by role.'))
children.push(num('Connection manager — register and manage the databases to be monitored; passwords are encrypted before storage.'))
children.push(num('Live health monitoring — a shared poller re-scans the selected database every 15 seconds and shows issues with severity and a recommended fix.'))
children.push(num('Issue remediation — each detected issue offers an executable SQL fix that can be applied with one click.'))
children.push(num('Autopilot rules — define rules that automatically apply safe fixes or only suggest them.'))
children.push(num('Concurrency & locks — a live view of active sessions, blocking chains and deadlock risk.'))
children.push(num('Schema explorer — an ER-style map of the target’s tables, columns and foreign keys.'))
children.push(num('Query plan diff & JSON explorer — inspect execution plans (JSONB) before and after a fix.'))
children.push(num('OLAP analytics — run the ETL pipeline and explore incident trends, heatmaps and CUBE pivots.'))
children.push(num('Backups & reports — track backup history and generate summary reports.'))
children.push(H2('3.1 Screen-to-Function Map'))
children.push(table(
  ['Screen', 'Functionality'],
  [
    ['Login', 'Authenticate; issue JWT session token'],
    ['Dashboard', 'Health-score gauge, issue breakdown, list of monitored databases'],
    ['Live Health', 'Real-time issue feed with one-click "Apply Fix"'],
    ['Connections', 'Add / test / pause / delete monitored databases'],
    ['Autopilot', 'Create and toggle automation rules (auto / suggest / off)'],
    ['Concurrency & Locks', 'Active sessions, blocking pairs and deadlock detection'],
    ['Schema', 'Tables, columns (PK/FK) and relationships of the target'],
    ['Plan Diff / JSON Explorer', 'Execution plans stored as JSONB, before vs after a fix'],
    ['OLAP', 'ETL trigger plus heatmap, trend and CUBE pivot analytics'],
    ['Backup / Report', 'Backup history and generated reports'],
    ['API Docs', 'Interactive Swagger documentation of all endpoints'],
  ],
  [2600, 6760]
))

// ---- 4. DB CONCEPTS USED ----
children.push(H1('4. Database Concepts Used'))
children.push(P('The project implements a broad set of Advanced DBMS concepts. The table below maps each concept to where and how it is used.'))
children.push(table(
  ['Concept', 'How it is implemented in the project'],
  [
    ['Primary & Foreign Keys', 'UUID primary keys (gen_random_uuid()); foreign keys link issues, actions and plans to their connection, with ON DELETE CASCADE / SET NULL.'],
    ['Constraints (CHECK, UNIQUE, NOT NULL)', 'CHECK constraints validate role and severity values; UNIQUE on username/email; NOT NULL on required fields.'],
    ['Indexes', 'Composite B-tree (connection_id, severity, detected_at), partial indexes (WHERE is_resolved = FALSE), and a GIN index on a JSONB column.'],
    ['Views', 'v_connection_health, v_action_log, v_rule_effectiveness, v_performance_trend_24h — joins and aggregates used by the dashboard.'],
    ['Stored Procedures', 'sp_log_issue, sp_resolve_issue and sp_apply_fix (a transaction that logs an action and resolves the issue atomically).'],
    ['Functions', 'fn_compute_health_score returns a 0–100 score derived from open issues by severity.'],
    ['Triggers & Auditing', 'fn_audit_changes() fires AFTER INSERT/UPDATE/DELETE on key tables and writes old/new row images (JSONB) into audit_log.'],
    ['Transactions (ACID)', 'Multi-statement work wrapped in BEGIN/COMMIT/ROLLBACK (withTransaction helper and sp_apply_fix) to guarantee all-or-nothing updates.'],
    ['JSONB / Semi-structured data', 'Query execution plans stored as JSONB and searched via a GIN index — document-style data inside a relational DB.'],
    ['Row-Level Security (RLS)', 'Enabled on detected_issues with a policy to demonstrate row-level access control.'],
    ['Hashing & Encryption', 'bcrypt (pgcrypto) for login passwords; AES-256-CBC for monitored-database passwords, decrypted only at connect time.'],
    ['Role-Based Access Control', 'Three roles (viewer / operator / admin) enforced via a CHECK constraint and checked in the API layer.'],
    ['Concurrency Control', 'Detection of blocking and deadlocks via pg_stat_activity and pg_blocking_pids(); demonstrates locks, waits and MVCC.'],
    ['MVCC, VACUUM & Bloat', 'Dead tuples from MVCC measured via pg_stat_user_tables; VACUUM (ANALYZE) used as a fix to reclaim space.'],
    ['Query Optimization', 'Sequential-vs-index scan analysis and pg_stat_statements timing to flag missing indexes and slow queries; EXPLAIN plans captured.'],
    ['Connection Pooling', 'node-postgres and mssql connection pools reuse connections; managed-Postgres TLS handled per connection.'],
    ['Data Warehousing (OLAP)', 'Star schema: fact_incidents fact table with dim_database, dim_issue_type, dim_time and dim_fix_type dimensions.'],
    ['ETL', 'Pipeline that extracts issues from PostgreSQL, transforms dates/dimensions, and loads the MSSQL fact/dimension tables (idempotent).'],
    ['CUBE / ROLLUP', 'Dynamic multi-dimensional aggregation (GROUP BY CUBE) for slice-and-dice analytics on the warehouse.'],
  ],
  [2700, 6660]
))

// ---- 5. EERD ----
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(H1('5. EERD Diagram'))
children.push(P('The Enhanced Entity-Relationship Diagram (EERD) below shows the entities, attributes and relationships of the application database, including the OLAP star-schema entities.'))
children.push(...blank(1))
children.push(placeholder('[ Insert EERD diagram here ]'))
children.push(...blank(14))
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Figure 5.1 — Enhanced Entity-Relationship Diagram', italics: true, size: 20, color: '475569' })] }))

// ---- 6. SCREENSHOTS OF TABLES ----
children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(H1('6. Screenshots of Tables Created'))
children.push(P('This section contains screenshots of the tables created in the database. The application (OLTP) tables and the data-warehouse (OLAP) tables are listed below; paste the corresponding screenshot under each caption.'))

const oltpTables = [
  ['users', 'Application users with role and hashed password'],
  ['monitored_connections', 'Registered databases being monitored'],
  ['detected_issues', 'Issues found by scans, with severity and status'],
  ['autopilot_rules', 'Automation rules (auto / suggest / off)'],
  ['autopilot_actions', 'Record of every fix applied or suggested'],
  ['query_plans', 'Execution plans stored as JSONB'],
  ['backup_history', 'Backup runs and their status'],
  ['audit_log', 'Automatic change history (from triggers)'],
]
const olapTables = [
  ['fact_incidents', 'OLAP fact table — one row per incident'],
  ['dim_database', 'Dimension — monitored database'],
  ['dim_issue_type', 'Dimension — issue category'],
  ['dim_time', 'Dimension — date/time parts'],
  ['dim_fix_type', 'Dimension — type of fix'],
]

children.push(H2('6.1 Application Database (OLTP) Tables'))
let fig = 1
for (const [name, desc] of oltpTables) {
  children.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [
    new TextRun({ text: name, bold: true, font: 'Courier New' }),
    new TextRun({ text: '  —  ' + desc, color: '475569' }),
  ] }))
  children.push(placeholder('[ Insert screenshot of "' + name + '" table here ]'))
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
    new TextRun({ text: 'Figure 6.' + (fig++) + ' — ' + name, italics: true, size: 20, color: '475569' }) ] }))
  children.push(...blank(1))
}

children.push(new Paragraph({ children: [new PageBreak()] }))
children.push(H2('6.2 Data Warehouse (OLAP) Tables'))
for (const [name, desc] of olapTables) {
  children.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [
    new TextRun({ text: name, bold: true, font: 'Courier New' }),
    new TextRun({ text: '  —  ' + desc, color: '475569' }),
  ] }))
  children.push(placeholder('[ Insert screenshot of "' + name + '" table here ]'))
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
    new TextRun({ text: 'Figure 6.' + (fig++) + ' — ' + name, italics: true, size: 20, color: '475569' }) ] }))
  children.push(...blank(1))
}

// ---- DOCUMENT ----
const doc = new Document({
  creator: 'DB Autopilot',
  title: 'DB Autopilot - Project Report',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'DB Autopilot — ADBMS Project Report   |   Page ', size: 18, color: '888888' }),
      new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
    ] })] }) },
    children,
  }],
})

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('WROTE', OUT) })
