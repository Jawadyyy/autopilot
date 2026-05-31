import Link from 'next/link'

const FEATURES = [
  { icon: '◎', title: 'Live Monitoring', desc: 'Every screen continuously scans pg_stat_activity, locks, bloat and slow queries in real time.' },
  { icon: '⚡', title: 'Self-Healing Autopilot', desc: 'Rules detect issues and apply or recommend fixes — index creation, vacuum, lock resolution.' },
  { icon: '🛡', title: 'Issue Remediation', desc: 'Each alert ships with a clear “how to counter it” and copy-ready SQL.' },
  { icon: '◧', title: 'Query Plan Diff', desc: 'EXPLAIN ANALYZE captured as JSONB and rendered before/after with cost deltas.' },
  { icon: '⛁', title: 'Backup & Recovery', desc: 'pg_dump backups, WAL LSN tracking and point-in-time restore from the console.' },
  { icon: '◴', title: 'OLAP Analytics', desc: 'Star-schema warehouse with CUBE/ROLLUP for incident trend analysis.' },
]

const STEPS = [
  { n: '01', title: 'Connect', desc: 'Register any PostgreSQL or MSSQL database with host + credentials. No changes to the target.' },
  { n: '02', title: 'Scan', desc: 'DB Autopilot polls the system catalogs and surfaces issues with severity and root cause.' },
  { n: '03', title: 'Heal', desc: 'Apply the recommended fix in a click, or let autopilot rules resolve it automatically.' },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03040b] text-white">
      {/* Ambient animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#2f75ff]/20 blur-[120px] animate-drift" />
        <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full bg-[#7faaff]/10 blur-[130px] animate-drift" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-[#34d399]/10 blur-[120px] animate-drift" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-[#070b18]/60 px-8 py-5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2f75ff] flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-[#2f75ff]/30">DA</div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7faaff]">DB Autopilot</p>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
              <a href="#features" className="transition hover:text-white">Features</a>
              <a href="#how" className="transition hover:text-white">How it works</a>
              <a href="#cta" className="transition hover:text-white">Get started</a>
            </nav>
            <Link href="/login" className="inline-flex items-center rounded-full bg-[#2f75ff] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/20 transition hover:bg-[#4b8cff]">
              Sign In
            </Link>
          </div>
        </header>

        <main className="px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Hero */}
            <section className="grid gap-12 py-16 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div className="space-y-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#7faaff]/20 bg-[#2f75ff]/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#7faaff]">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulseline" /> Self-monitoring · self-healing
                </span>
                <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                  The database that <span className="bg-gradient-to-r from-[#7faaff] to-[#34d399] bg-clip-text text-transparent">heals itself.</span>
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-300">
                  Connect PostgreSQL or MSSQL and watch DB Autopilot detect slow queries, deadlocks, bloat and lock contention in real time — then tell you exactly how to fix each one.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/login" className="inline-flex items-center rounded-full bg-[#2f75ff] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/30 transition hover:bg-[#4b8cff]">
                    Launch Command Center →
                  </Link>
                  <a href="#features" className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#2f75ff] hover:bg-[#2f75ff]/10">
                    See features
                  </a>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {[
                    { v: 'Real-time', l: 'Catalog scanning' },
                    { v: 'PG + MSSQL', l: 'Multi-engine' },
                    { v: '0-touch', l: 'No target changes' },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl border border-white/10 bg-[#081b34]/70 p-4">
                      <p className="text-xl font-semibold text-white">{s.v}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live feed mock */}
              <div className="animate-floaty rounded-[2rem] border border-white/10 bg-[#06101f]/90 p-6 shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-400 animate-pulseline" /> Live Health Feed</span>
                  <span>prod-postgres</span>
                </div>
                <div className="mt-3 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#08182b]/80 p-4">
                  <div className="text-4xl font-bold text-green-400">92</div>
                  <div className="text-xs text-slate-400">Health score<br />2 warnings · 0 critical</div>
                  <div className="ml-auto h-12 flex items-end gap-1">
                    {[40, 65, 50, 80, 60, 92, 70].map((h, i) => (
                      <span key={i} className="w-2 rounded-t bg-[#2f75ff]/60" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border-l-4 border-orange-500 bg-orange-500/10 p-4">
                    <p className="font-semibold text-white">HIGH · Table bloat: orders (43%)</p>
                    <p className="mt-1 text-slate-400">12,402 dead tuples wasting space.</p>
                    <p className="mt-2 font-mono text-xs text-green-300">VACUUM (ANALYZE) "public"."orders";</p>
                  </div>
                  <div className="rounded-2xl border-l-4 border-yellow-500 bg-yellow-500/10 p-4">
                    <p className="font-semibold text-white">WARNING · Frequent sequential scans: users</p>
                    <p className="mt-1 text-slate-400">Scanned 1,204× — index likely missing.</p>
                    <p className="mt-2 font-mono text-xs text-green-300">CREATE INDEX ON "public"."users" (email);</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Features */}
            <section id="features" className="py-16">
              <div className="text-center max-w-2xl mx-auto">
                <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff]">Everything in one console</p>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Observe, diagnose, and heal — without leaving the dashboard</h2>
              </div>
              <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="group rounded-[1.5rem] border border-white/10 bg-[#081a2d]/70 p-6 transition hover:border-[#2f75ff]/40 hover:bg-[#0c2241]/70">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2f75ff]/15 text-xl text-[#7faaff] transition group-hover:bg-[#2f75ff]/25">{f.icon}</div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section id="how" className="py-16">
              <div className="text-center max-w-2xl mx-auto">
                <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff]">Three steps</p>
                <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">From connection to cure</h2>
              </div>
              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {STEPS.map((s) => (
                  <div key={s.n} className="relative rounded-[1.5rem] border border-white/10 bg-[#081a2d]/70 p-8">
                    <span className="text-5xl font-bold text-[#2f75ff]/30">{s.n}</span>
                    <h3 className="mt-3 text-xl font-semibold text-white">{s.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section id="cta" className="py-16">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0c2241] to-[#081428] p-10 text-center sm:p-16">
                <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#2f75ff]/20 blur-[100px]" />
                <h2 className="relative text-3xl font-semibold sm:text-4xl">Give your databases an autopilot.</h2>
                <p className="relative mx-auto mt-4 max-w-xl text-slate-300">
                  Sign in, connect a database, and see live health, issues, and fixes in under a minute.
                </p>
                <Link href="/login" className="relative mt-8 inline-flex items-center rounded-full bg-[#2f75ff] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/30 transition hover:bg-[#4b8cff]">
                  Get Started Free →
                </Link>
              </div>
            </section>
          </div>
        </main>

        <footer className="border-t border-white/10 bg-[#070b18]/80 px-8 py-10">
          <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#2f75ff] flex items-center justify-center text-xs font-bold">DA</div>
              <span className="text-sm text-slate-400">DB Autopilot — self-monitoring, self-healing databases.</span>
            </div>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} DB Autopilot. Built for PostgreSQL & MSSQL.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
