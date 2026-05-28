import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function PlanDiffPage() {
  return (
    <AppShell>
      <PageHeader
        title="Query Plan Diff Viewer"
        description="Compare execution plans before and after an optimization, with scan type highlights and execution cost bars."
      />

      <div className="grid gap-6">
        <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_22px_60px_rgba(0,0,0,0.25)]">
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-[#0d0f14]/85 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#ff6f3d]">Before fix</p>
                <p className="mt-2 text-lg font-semibold text-white">Seq Scan dominates</p>
              </div>
              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase text-red-300">High cost</span>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0b0d12]/90 p-4 overflow-x-auto">
              <pre className="whitespace-pre text-xs leading-6 text-zinc-300">EXPLAIN ANALYZE
Seq Scan on orders  ...  cost=0.00..4235.54 rows=100000 width=120
  Filter: (status = 'pending')
  Rows Removed by Filter: 320000
</pre>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4 rounded-3xl bg-[#0d0f14]/85 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#57d68d]">After fix</p>
                <p className="mt-2 text-lg font-semibold text-white">Index scan enabled</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-300">Lower latency</span>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0b0d12]/90 p-4 overflow-x-auto">
              <pre className="whitespace-pre text-xs leading-6 text-zinc-300">EXPLAIN ANALYZE
Index Scan using orders_status_idx on orders  ...  cost=0.42..32.10 rows=150 width=120
  Index Cond: (status = 'pending')
  Buffers: shared hit=1722
</pre>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#15171c]/95 p-5">
            <p className="text-sm text-zinc-300">Execution time comparison</p>
            <div className="space-y-3">
              <div className="h-4 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-[#ff6f3d]" style={{ width: '82%' }} />
              </div>
              <div className="h-4 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: '18%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Before: 3.2s</span>
              <span>After: 0.7s</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
