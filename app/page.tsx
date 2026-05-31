import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#03040b] text-white">
      <header className="border-b border-white/10 bg-[#070b18]/80 px-8 py-5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2f75ff] flex items-center justify-center text-sm font-bold text-white">DA</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7faaff]">DB Autopilot</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
            <Link href="#" className="transition hover:text-white">Product</Link>
            <Link href="#" className="transition hover:text-white">Solutions</Link>
            <Link href="#" className="transition hover:text-white">Pricing</Link>
            <Link href="#" className="transition hover:text-white">Docs</Link>
          </nav>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#2f75ff] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/20 transition hover:bg-[#4b8cff]"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-12 xl:grid-cols-[0.9fr_1fr] xl:items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center rounded-full border border-[#7faaff]/20 bg-[#2f75ff]/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-[#7faaff]">
                Now supporting PostgreSQL 16 & MSSQL 2022
              </span>

              <div className="space-y-6">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  The Database That <span className="text-[#7faaff]">Heals Itself.</span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Automate slow query detection, deadlock resolution, and performance tuning across PostgreSQL and MSSQL clusters. The SRE command center for modern data infrastructure.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-[#2f75ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/20 transition hover:bg-[#4b8cff]"
                >
                  Get Started for Free
                </Link>
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#2f75ff] hover:bg-[#2f75ff]/10"
                >
                  View Technical Specs
                </a>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: '50,000+ clusters monitored', value: '50,000+' },
                  { label: 'Uptime guaranteed', value: '99.9%' },
                  { label: 'Config setup', value: 'Zero' },
                  { label: 'Avg healing latency', value: '12ms' },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-[#081b34]/95 p-5">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#06101f]/95 p-6 shadow-[0_40px_80px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-x-4 top-4 h-1 rounded-full bg-gradient-to-r from-[#2f75ff] via-[#7faaff] to-[#a5b7ff] opacity-40" />
              <div className="relative grid gap-6">
                <div className="rounded-[1.75rem] border border-white/10 bg-[#08182b]/90 p-6">
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
                    <span className="uppercase tracking-[0.3em]">Global throughput</span>
                    <span className="font-semibold text-white">42.5k req/s</span>
                  </div>
                  <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061327]">
                    <Image
                      src="/hero-dashboard.svg"
                      alt="Global throughput dashboard"
                      width={800}
                      height={520}
                      className="h-[320px] w-full object-cover"
                    />
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-[#08182b]/90 p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { title: 'Real-time Monitoring', detail: '24/7 system health and transaction logs.' },
                      { title: 'Autopilot Healing', detail: 'Automate bottleneck recovery and index tuning.' },
                      { title: 'Visual Query Plans', detail: 'Explain plans with heatmaps and node insights.' },
                      { title: 'OLAP Analytics', detail: 'Long-term trend analysis for capacity planning.' },
                    ].map((item) => (
                      <div key={item.title} className="rounded-3xl border border-white/10 bg-[#071426] p-4">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-3 text-sm text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16 grid gap-10 xl:grid-cols-[0.6fr_0.8fr]">
            <div className="space-y-6 rounded-[2rem] border border-white/10 bg-[#081a2d]/95 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
              <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff]">Precision Engineering for SREs</p>
              <h2 className="text-3xl font-semibold text-white">Complex database administration simplified through intelligent automation and visual clarity.</h2>
              <p className="text-sm leading-7 text-slate-300">
                The command center for service reliability engineering teams managing PostgreSQL and MSSQL clusters at scale.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  'Conflict resolution with long-running transaction control',
                  'Hypothetical index analysis before production rollout',
                  'Visual query optimization and EXPLAIN insights',
                  'Immutable backup workflow and audit trail review',
                ].map((item) => (
                  <div key={item} className="rounded-[1.75rem] border border-white/10 bg-[#0d2645]/95 p-5 text-sm text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#08182d]/95 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.2)]">
              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff]">Watch It Heal In Real-Time.</p>
                  <h3 className="text-2xl font-semibold text-white">The Live Health Feed doesn’t just alert you — it executes solutions.</h3>
                  <p className="text-sm leading-7 text-slate-300">
                    Watch DB Autopilot resolve deadlocks and create indexes as they happen.
                  </p>
                </div>

                <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-[#061226]/95 p-5">
                  <div className="rounded-3xl border border-[#2f75ff]/20 bg-[#04101f]/95 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Conflict Resolution</p>
                    <p className="mt-2">Automatically terminates long-running blocking transactions based on custom SRE rules.</p>
                  </div>
                  <div className="rounded-3xl border border-[#2f75ff]/20 bg-[#04101f]/95 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Auto-indexing</p>
                    <p className="mt-2">Hypothetical index analysis validates performance gains before production rollout.</p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-[#06112a]/95 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
                    <span>Live Health Feed</span>
                    <span>14 Events Resolved Today</span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-3xl border-l-4 border-red-500 bg-red-500/10 p-4">
                      <p className="font-semibold text-white">CRITICAL: DEADLOCK_DETECTED</p>
                      <p className="text-slate-400 mt-1">PID 14202 blocked by PID 14205 (Schema: prod_v3)</p>
                      <p className="text-slate-400 mt-1">Autopilot: Terminating lower-priority session (PID 14202)</p>
                    </div>
                    <div className="rounded-3xl border-l-4 border-amber-400 bg-amber-400/10 p-4">
                      <p className="font-semibold text-white">WARNING: SLOW_QUERY_PEAK</p>
                      <p className="text-slate-400 mt-1">SELECT * FROM orders WHERE status = 'pending' ... (Cost: 14,280)</p>
                      <p className="text-slate-400 mt-1">Autopilot: Generating missing index idx_orders_status ... SUCCESS</p>
                    </div>
                    <div className="rounded-3xl border-l-4 border-cyan-400 bg-cyan-400/10 p-4">
                      <p className="font-semibold text-white">INFO: VACUUM_TRIGGERED</p>
                      <p className="text-slate-400 mt-1">Table: users (Bloat: 24%)</p>
                      <p className="text-slate-400 mt-1">Status: Autovacuum completed in 1.4s</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#070b18] px-8 py-12">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff] font-semibold">DB Autopilot</p>
              <p className="mt-4 text-sm text-slate-400">The command center for SREs and DBAs managing high-scale PostgreSQL and MSSQL clusters at modern enterprises.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff] font-semibold">Product</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Query Plan Diff</a></li>
                <li><a href="#" className="hover:text-white transition">Cluster Status</a></li>
                <li><a href="#" className="hover:text-white transition">Rules Engine</a></li>
                <li><a href="#" className="hover:text-white transition">OLAP Analytics</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff] font-semibold">Resources</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition">SRE Guides</a></li>
                <li><a href="#" className="hover:text-white transition">Status Page</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#7faaff] font-semibold">Company</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Security Compliance</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">© 2024 DB Autopilot Systems. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-white transition">Twitter</a>
              <a href="#" className="text-slate-400 hover:text-white transition">GitHub</a>
              <a href="#" className="text-slate-400 hover:text-white transition">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
