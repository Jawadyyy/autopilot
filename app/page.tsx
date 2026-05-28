import Link from 'next/link'
import AppShell from './components/AppShell'
import PageHeader from './components/PageHeader'

export default function HomePage() {
  return (
    <AppShell>
      <PageHeader
        title="Database Autopilot"
        description="A unified operations console for monitored sources, live health, query plan diffing, and automated recovery workflows."
        tag="Welcome"
      />

      <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <div className="rounded-[2rem] border border-white/10 bg-[#081f3f]/95 p-10 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
          <p className="text-sm text-slate-300">
            Modern database reliability starts with live observability, fast root-cause discovery, and safe auto-healing recommendations.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-3xl bg-[#2f75ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2f75ff]/20 transition hover:bg-[#4b8cff]">
              View dashboard
            </Link>
            <Link href="/connections" className="inline-flex items-center justify-center rounded-3xl border border-[#7faaff]/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#2f75ff] hover:bg-[#2f75ff]/10">
              Add connection
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Connected sources', value: '3' },
              { title: 'Live alerts', value: '18' },
              { title: 'Rule actions', value: 'Auto / Suggest' },
              { title: 'Analytics', value: 'OLAP-ready' },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-[#0c2140]/95 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.title}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-[#081a2d]/95 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
          <div className="rounded-[1.75rem] bg-[#081c30]/95 p-6 shadow-inner shadow-black/20">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7faaff]">Why DB Autopilot</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">A unified platform for monitoring and recovery.</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Built to reduce manual toil, track database health continuously, and surface actionable fixes without a flood of false positives.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {[
              'Live monitoring across multiple database sources',
              'Rule-based automation with auto/suggest modes',
              'Visual query plan diffing and optimization insights',
              'Backup recovery and OLAP incident analytics',
            ].map((item) => (
              <div key={item} className="rounded-[1.75rem] border border-white/10 bg-[#0d2548]/95 p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AppShell>
  )
}
