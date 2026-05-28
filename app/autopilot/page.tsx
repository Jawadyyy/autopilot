import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function AutopilotPage() {
  return (
    <AppShell>
      <PageHeader
        title="Autopilot Rules Engine"
        description="Configure rules for automated detection and repair. Auto, suggest, or offline modes let you control exactly how the system remediates issues."
      />

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="rounded-[1.75rem] bg-[#0d0f14]/95 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#ff6f3d]">Rule engine</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Active automation rules</h2>
              </div>
              <button className="inline-flex items-center rounded-3xl bg-gradient-to-r from-[#c92f41] via-[#ff6f3d] to-[#a11d33] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ff6f3d]/20 transition hover:brightness-110">
                Add rule
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  title: 'Sequential scan on large table',
                  condition: 'seq scan on table > 10k rows',
                  action: 'Create index automatically',
                  mode: 'Auto',
                },
                {
                  title: 'Long transaction lock',
                  condition: 'transaction running > 120s',
                  action: 'Notify operator',
                  mode: 'Suggest',
                },
              ].map((rule) => (
                <div key={rule.title} className="rounded-3xl border border-white/10 bg-[#111317]/90 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{rule.title}</p>
                      <p className="mt-2 text-sm text-zinc-400">{rule.condition}</p>
                    </div>
                    <span className="rounded-full bg-[#ff6f3d]/10 px-3 py-1 text-xs font-semibold uppercase text-[#ff6f3d]">{rule.mode}</span>
                  </div>
                  <p className="mt-4 text-sm text-zinc-300">Action: {rule.action}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
