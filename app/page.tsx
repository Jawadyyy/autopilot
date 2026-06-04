import Link from 'next/link'
import { LogoMark } from './components/Logo'

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
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Soft ambient wash */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-32 h-[460px] w-[460px] rounded-full bg-[#2f6bff]/10 blur-[140px]" />
        <div className="absolute top-1/4 -right-40 h-[480px] w-[480px] rounded-full bg-[#7c3aed]/8 blur-[150px]" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 h-16">
            <div className="flex items-center gap-2.5">
              <LogoMark size={36} className="rounded-[11px] shadow-sm" />
              <p className="text-sm font-semibold text-slate-900">DB Autopilot</p>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="transition hover:text-slate-900">Features</a>
              <a href="#how" className="transition hover:text-slate-900">How it works</a>
              <a href="#cta" className="transition hover:text-slate-900">Get started</a>
            </nav>
            <Link href="/login" className="inline-flex items-center rounded-lg bg-[#2f6bff] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f54e0]">
              Sign In
            </Link>
          </div>
        </header>

        <main className="px-6">
          <div className="mx-auto max-w-6xl">
            {/* Hero */}
            <section className="flex flex-col items-center py-24 text-center">
              <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
                The database that{' '}
                <span className="bg-gradient-to-r from-[#2f6bff] to-[#7c3aed] bg-clip-text text-transparent">heals itself.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Connect PostgreSQL or MSSQL and watch DB Autopilot detect slow queries, deadlocks, bloat and lock contention in real time — then tell you exactly how to fix each one.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/login" className="inline-flex items-center rounded-lg bg-[#2f6bff] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f54e0]">
                  Launch Command Center →
                </Link>
                <a href="#features" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  See features
                </a>
              </div>
              <div className="mt-12 grid w-full max-w-2xl grid-cols-3 gap-3">
                {[
                  { v: 'Real-time', l: 'Catalog scanning' },
                  { v: 'PG + MSSQL', l: 'Multi-engine' },
                  { v: '0-touch', l: 'No target changes' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <p className="text-lg font-bold text-slate-900">{s.v}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{s.l}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20">
              <div className="text-center max-w-2xl mx-auto">
                <p className="text-xs uppercase tracking-wider font-semibold text-[#2f6bff]">Everything in one console</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Observe, diagnose, and heal — without leaving the dashboard</h2>
              </div>
              <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3ff] text-xl text-[#2f6bff]">{f.icon}</div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section id="how" className="py-20">
              <div className="text-center max-w-2xl mx-auto">
                <p className="text-xs uppercase tracking-wider font-semibold text-[#2f6bff]">Three steps</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">From connection to cure</h2>
              </div>
              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {STEPS.map((s) => (
                  <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <span className="text-5xl font-bold text-[#2f6bff]/20">{s.n}</span>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section id="cta" className="py-20">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f54e0] to-[#2f6bff] p-10 text-center shadow-lg sm:p-16">
                <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/10 blur-[100px]" />
                <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">Give your databases an autopilot.</h2>
                <p className="relative mx-auto mt-4 max-w-xl text-blue-50">
                  Sign in, connect a database, and see live health, issues, and fixes in under a minute.
                </p>
                <Link href="/login" className="relative mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-[#1f54e0] shadow-sm transition hover:bg-blue-50">
                  Get Started Free →
                </Link>
              </div>
            </section>
          </div>
        </main>

        <footer className="border-t border-slate-100 bg-white px-6 py-10">
          <div className="mx-auto max-w-6xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <LogoMark size={32} className="rounded-[9px]" />
              <span className="text-sm text-slate-500">DB Autopilot — self-monitoring, self-healing databases.</span>
            </div>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} DB Autopilot. Built for PostgreSQL &amp; MSSQL.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
