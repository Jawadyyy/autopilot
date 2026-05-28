import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function LocksPage() {
  return (
    <AppShell>
      <PageHeader
        title="Concurrency & Lock Monitor"
        description="Live locking dependency visualization with blockers, wait state, and termination support for runaway sessions."
      />

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0d0f14]/90 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Active sessions</p>
              <p className="mt-4 text-3xl font-semibold text-white">18</p>
              <p className="mt-2 text-sm text-zinc-400">Active / idle / waiting summary.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0d0f14]/90 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Deadlock chain</p>
              <p className="mt-4 text-3xl font-semibold text-[#ff6f3d]">1</p>
              <p className="mt-2 text-sm text-zinc-400">Detected blocker chain requires review.</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95 p-5">
            <h2 className="text-lg font-semibold text-white">Lock dependencies</h2>
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-[#11131a]/90 p-4">
                <p className="font-semibold text-white">Session 42 is blocking Session 57 on table orders</p>
                <p className="mt-2 text-sm text-zinc-400">Lock type: ROW EXCLUSIVE, duration: 48s</p>
                <button className="mt-4 inline-flex rounded-3xl bg-[#c92f41] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff6f3d]/90">
                  Terminate blocker
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
