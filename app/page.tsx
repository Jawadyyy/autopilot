import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Public Header */}
      <header className="border-b border-white/10 bg-[#0a0f1a]/50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2f75ff] rounded-lg flex items-center justify-center text-sm font-bold text-white">
            DA
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7faaff]">DB Autopilot</p>
            <p className="text-xs text-slate-400">SRE Center</p>
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-3xl bg-[#2f75ff] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/20 transition hover:bg-[#4b8cff]"
        >
          Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="px-8 py-16">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] max-w-7xl mx-auto">
          <div className="rounded-[2rem] border border-white/10 bg-[#081f3f]/95 p-10 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
            <div className="mb-8">
              <span className="inline-flex rounded-full bg-[#4c0914]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#fecaca]">
                SRE Command Center
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Database Autopilot</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                A unified operations console for monitored sources, live health, plan differencing, and automated recovery workflows.
              </p>
            </div>

            <p className="text-sm text-slate-300">
              Modern database reliability starts with live observability, fast root-cause discovery, and safe auto-healing recommendations.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-3xl bg-[#2f75ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/20 transition hover:bg-[#4b8cff]"
              >
                Get Started
              </Link>
              <a
                href="https://github.com"
                className="inline-flex items-center justify-center rounded-3xl border border-[#7faaff]/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#2f75ff] hover:bg-[#2f75ff]/10"
              >
                Documentation
              </a>
            </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Connected sources', value: '3' },
              { title: 'Live alerts', value: '18' },
              { title: 'Rule actions', value: 'Auto / Suggest' },
              { title: 'Analytics', value: 'OLAP ready' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-white/10 bg-[#0c2140]/95 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.title}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

            <div className="mt-10 rounded-[2rem] border border-white/10 bg-[#091328]/90 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7faaff]">Capabilities</p>
              <h3 className="mt-4 text-xl font-semibold text-white">Enterprise-grade database observability</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Real-time monitoring, automated issue detection, and guided remediation for PostgreSQL and MSSQL workloads at scale.
              </p>

              <div className="mt-6 space-y-3">
                <div className="p-3 rounded-lg border border-white/10 bg-[#0a1a28] text-sm text-slate-300">
                  Live health feed with 14+ event types detected in real time
                </div>
                <div className="p-3 rounded-lg border border-white/10 bg-[#0a1a28] text-sm text-slate-300">
                  Query plan analysis with visual diffing for optimization
                </div>
                <div className="p-3 rounded-lg border border-white/10 bg-[#0a1a28] text-sm text-slate-300">
                  Automatic backup and point-in-time recovery workflows
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[#081a2d]/95 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
            <div className="rounded-[1.75rem] bg-[#081c30]/95 p-6 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7faaff]">Overview</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">Built for modern SREs</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Reduce manual toil, track database health continuously, and surface actionable fixes without false positives.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {[
                'Multi-database monitoring and unified dashboards',
                'Rule-based automation with approval workflows',
                'Visual query optimization with EXPLAIN analysis',
                'Backup and PITR with immutable audit trails',
              ].map((item) => (
                <div key={item} className="rounded-[1.75rem] border border-white/10 bg-[#0d2548]/95 p-4 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-[#0c1830]/95 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[#7faaff]">Version</p>
              <h4 className="mt-3 text-lg font-semibold text-white">DB Autopilot 1.0</h4>
              <p className="mt-2 text-sm text-slate-400">
                Production-ready platform for automated database reliability.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#2f75ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4b8cff] w-full text-center"
              >
                Launch Dashboard
              </Link>
            </div>
          </aside>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0f1a] px-8 py-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7faaff] font-semibold">Product</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Status Page</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7faaff] font-semibold">Resources</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7faaff] font-semibold">Company</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7faaff] font-semibold">Legal</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex items-center justify-between">
            <p className="text-xs text-slate-500">© 2024 DB Autopilot. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-white transition">Twitter</a>
              <a href="#" className="text-slate-400 hover:text-white transition">GitHub</a>
              <a href="#" className="text-slate-400 hover:text-white transition">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
