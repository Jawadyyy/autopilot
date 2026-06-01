-- ============================================================================
-- DB Autopilot — OLAP Warehouse (MSSQL star schema)
-- ============================================================================
-- Run once against the MSSQL database named by MSSQL_DB (default
-- db_autopilot_olap). The ETL endpoint (/api/olap?action=etl) loads these from
-- the PostgreSQL OLTP `detected_issues` table.
--
--   sqlcmd -S localhost -d db_autopilot_olap -i db/olap_schema.sql
-- ============================================================================

IF OBJECT_ID('dbo.fact_incidents', 'U') IS NULL
CREATE TABLE dbo.fact_incidents (
  incident_id        BIGINT IDENTITY(1,1) PRIMARY KEY,
  source_issue_id    UNIQUEIDENTIFIER NOT NULL UNIQUE,   -- maps to OLTP detected_issues.id
  database_id        INT NULL,
  issue_type_id      INT NULL,
  time_id            INT NULL,
  fix_type_id        INT NULL,
  severity_level     INT NOT NULL DEFAULT 1,             -- 1 info .. 4 critical
  is_resolved        BIT NOT NULL DEFAULT 0,
  fix_success        BIT NOT NULL DEFAULT 0,
  resolution_minutes INT NULL,
  detected_at        DATETIME2 NOT NULL
);

IF OBJECT_ID('dbo.dim_database', 'U') IS NULL
CREATE TABLE dbo.dim_database (
  database_id   INT IDENTITY(1,1) PRIMARY KEY,
  source_id     UNIQUEIDENTIFIER NOT NULL UNIQUE,
  database_name NVARCHAR(255) NOT NULL,
  db_type       NVARCHAR(50)  NULL,
  host          NVARCHAR(255) NULL
);

IF OBJECT_ID('dbo.dim_issue_type', 'U') IS NULL
CREATE TABLE dbo.dim_issue_type (
  issue_type_id  INT IDENTITY(1,1) PRIMARY KEY,
  issue_category NVARCHAR(100) NOT NULL UNIQUE,
  subcategory    NVARCHAR(100) NULL
);

IF OBJECT_ID('dbo.dim_time', 'U') IS NULL
CREATE TABLE dbo.dim_time (
  time_id     INT IDENTITY(1,1) PRIMARY KEY,
  full_date   DATE NOT NULL,
  hour_of_day INT  NOT NULL,
  day_of_week INT  NOT NULL,
  month_num   INT  NOT NULL,
  quarter_num INT  NOT NULL,
  year_num    INT  NOT NULL,
  CONSTRAINT uq_dim_time UNIQUE (full_date, hour_of_day)
);

IF OBJECT_ID('dbo.dim_fix_type', 'U') IS NULL
CREATE TABLE dbo.dim_fix_type (
  fix_type_id   INT IDENTITY(1,1) PRIMARY KEY,
  fix_type_name NVARCHAR(100) NOT NULL UNIQUE
);
