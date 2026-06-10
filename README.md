# DB Autopilot

Self-monitoring, self-healing database management platform. Connects to external
PostgreSQL / MSSQL databases, detects issues in real time, and applies or
recommends fixes — built on Next.js (App Router) with a PostgreSQL OLTP core and
an MSSQL OLAP warehouse.

## 1. Prerequisites

- Node.js 20+
- A PostgreSQL database for the app itself (a free **Supabase** project works well)
- `pg_dump` / `psql` on the server's PATH (only needed for the Backup console)
- (Optional) MSSQL for the OLAP analytics screen

## 2. Configure environment

Copy your settings into `.env.local` (already present in this repo):

```env
# Primary app database (PostgreSQL — e.g. Supabase)
POSTGRES_HOST=db.xxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password

# Auth — REQUIRED, the app refuses to sign tokens without these
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=8h

# Encryption key for stored DB passwords — REQUIRED
AES_SECRET_KEY=change-me-32+chars

# Optional — where pg_dump writes backups
BACKUP_DIR=./backups
```

> `JWT_SECRET` and `AES_SECRET_KEY` no longer have insecure fallbacks — they must be set.

## 3. Create the schema

Run the bundled schema against your **primary** Postgres database once. It creates
all tables, indexes, views, stored procedures, triggers, an RLS demo policy, and a
default admin user. It's idempotent and won't drop existing data.

```bash
psql "postgresql://postgres:PASSWORD@HOST:5432/postgres" -f db/schema.sql
```

Or paste the contents of [`db/schema.sql`](db/schema.sql) into the Supabase SQL editor.
It's idempotent — **re-run it after pulling updates** to pick up new columns
(e.g. the scan persistence columns on `detected_issues`).

### (Optional) OLAP warehouse

For the Analytics screen, create the MSSQL star schema and load it from the
OLTP data:

```bash
sqlcmd -S localhost -d db_autopilot_olap -i db/olap_schema.sql
```

Then open **OLAP Analytics → Run ETL** (admin only) to populate `fact_incidents`
from `detected_issues`. Without MSSQL configured the screen shows a friendly
"warehouse unavailable" notice.

**Default login** is seeded for you:

| Username | Password   | Role      |
|----------|------------|-----------|
| `admin`  | `admin123` | db_admin  |

(Change it after first login.)

## 4. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000 and log in with the admin account above.

## 5. Demo: connect a database and watch it live

1. Go to **Connection Manager**.
2. Click **Connect New Database** and fill in the target's host/port/db/user/password
   (you can point it at the same Supabase DB, or a second free Neon/Railway/Supabase DB).
3. Click **Test Connection** to verify the handshake, then **Save & Monitor**.
4. On the connection row, click **Live metrics** — a panel polls the target every
   5 seconds and shows active sessions, cache-hit ratio, average query time, and
   slow-query count pulled live from `pg_stat_activity` / `pg_stat_statements`.

> **Live query stats** (avg query time, slow-query count) require the
> `pg_stat_statements` extension on the *target* database. On Supabase it's
> available — enable it once with:
> ```sql
> CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
> ```
> Session counts and locks work without it.

## Tech stack

| Layer            | Tech                          |
|------------------|-------------------------------|
| Frontend + API   | Next.js 16 (App Router)       |
| Primary DB       | PostgreSQL (OLTP, JSONB, RLS) |
| OLAP warehouse   | MSSQL (`/api/olap`)           |
| Auth             | JWT (`jose`) + bcrypt         |
| Live feed        | Server-Sent Events (`/api/ws`)|
