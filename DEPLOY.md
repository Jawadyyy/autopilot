# Deploying DB Autopilot to Vercel

A multi-tenant, free-to-sign-up deployment. Each user only ever sees the
databases they connect; one admin (you) sees everything.

## How isolation works (read this)

Two independent layers stop data leaking between users:

1. **App layer** — every API route resolves the caller from the Supabase session
   and filters by ownership (`requireConnection` / `ownedConnectionIds` in
   `lib/auth/ownership.ts`). A user requesting another user's `connectionId`
   gets a 404.
2. **Database layer (defense-in-depth)** — Supabase auto-exposes `public`-schema
   tables over a REST API using the *publishable* key, which is shipped to the
   browser. The app enables **Row-Level Security (deny-by-default)** on every
   table (`lib/db/ensureSchema.ts`), so that REST API returns nothing. The app
   itself connects with the `POSTGRES_*` owner credentials, which bypass RLS, so
   it keeps working. RLS is applied automatically on first run — no manual SQL.

Stored external-DB passwords are encrypted at rest with `AES_SECRET_KEY`
(AES-256, `lib/utils/crypto.ts`).

## 1. Prepare Supabase

- Create / use a Supabase project. Run `db/schema.sql` once in the SQL editor
  (the app also self-heals missing tables/columns and applies RLS on boot).
- **Auth → URL Configuration**: set **Site URL** to your Vercel URL
  (e.g. `https://your-app.vercel.app`) and add these to **Redirect URLs**:
  - `https://your-app.vercel.app/reset-password`
  - `https://your-app.vercel.app/login`
- **Auth → Providers → Email**: decide whether to require email confirmation.
  On = users must verify before logging in; off = instant login after signup.
- Grab the connection string for the **transaction pooler** (port `6543`) and
  the **publishable (anon)** key.

## 2. Push to GitHub and import into Vercel

```bash
git add -A && git commit -m "vercel-ready" && git push
```

Then in Vercel: **New Project → import the repo**. Framework auto-detects as
Next.js. No `vercel.json` needed.

## 3. Set environment variables in Vercel

Copy from `.env.example`. Required:

| Var | Value |
|---|---|
| `POSTGRES_HOST` | `aws-1-xxxx.pooler.supabase.com` |
| `POSTGRES_PORT` | `6543` (transaction pooler) |
| `POSTGRES_DB` | `postgres` |
| `POSTGRES_USER` | `postgres.xxxx` |
| `POSTGRES_PASSWORD` | your DB password |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `ADMIN_EMAIL` | the email you'll sign up with as admin |
| `AES_SECRET_KEY` | strong random secret (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

Do **not** set `SUPABASE_SERVICE_ROLE_KEY` (unused; keep it secret).

## 4. Deploy and verify

After the build, open the URL and:

1. **Sign up** with `ADMIN_EMAIL` → you're the admin.
2. Sign up a **second** account (or use incognito) as a normal user.
3. Connect a database on each. Confirm each account sees only its own across
   Dashboard / Connections / Live Feed / Reports / Backup.
4. **Leak check**: with no session, this must return no rows:
   ```
   curl "https://xxxx.supabase.co/rest/v1/monitored_connections?select=*" \
     -H "apikey: <publishable key>"
   ```
   (RLS makes it return `[]`.)
5. **Password reset**: use *Forgot password* → Supabase emails a link →
   `/reset-password`.

## Notes for hosted mode

- **Backups** are metadata-only logical snapshots (DB size, per-table row
  counts, WAL LSN) stored in `backup_history` — no filesystem, no `pg_dump`.
  Physical `pg_dump`/restore runs only when self-hosted (binary + writable disk).
- **Live feed** polls `/api/health-events` (per-user scoped); there's no
  long-lived socket to keep open on serverless.
- **Open signup** means anyone can register and store (encrypted) DB credentials
  in your shared project. Fine for a demo/audience; if abuse is a concern, turn
  on email confirmation and/or restrict signups in Supabase Auth.
