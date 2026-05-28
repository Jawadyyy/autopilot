import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function ReportPage() {
  return (
    <AppShell>
      <PageHeader
        title="Performance Tuning Report"
        description="Compare the slowest queries, index improvements, and overall health score for your monitored databases."
      />

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="grid gap-6 sm:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95 p-5">
              <h2 className="text-lg font-semibold text-white">Health score</h2>
              <p className="mt-3 text-5xl font-semibold text-white">84</p>
              <p className="mt-2 text-sm text-zinc-400">Out of 100 across query performance, indexing, and recovery readiness.</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95 p-5">
              <h2 className="text-lg font-semibold text-white">Top slowest query</h2>
              <p className="mt-3 text-sm text-zinc-300">SELECT * FROM orders WHERE created_at &lt; NOW() - INTERVAL '1 day'</p>
              <p className="mt-4 text-sm text-zinc-400">Estimated improvement after recommended index: 78% faster.</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[#111317]/95 p-5 text-sm text-zinc-300">
            <p className="font-semibold text-white">Index improvements</p>
            <ul className="mt-4 space-y-3 list-disc pl-5 text-zinc-300">
              <li>Created `orders_status_idx`, reduced scan cost by 4.8x.</li>
              <li>Added partial index on `customers(is_active)` for active-user queries.</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
