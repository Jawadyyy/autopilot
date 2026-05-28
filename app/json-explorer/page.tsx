import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function JsonExplorerPage() {
  return (
    <AppShell>
      <PageHeader
        title="JSON Query Explorer"
        description="Search stored JSONB execution plans by filter, find seq scan occurrences, and compare relational vs JSON plan data."
      />

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">JSONB plan search</p>
              <p className="mt-3 text-sm text-zinc-300">Example: find plans where seq scan appears on tables with more than 10k rows.</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-[#111317]/95 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-[#ff6f3d]">Query output</p>
              <pre className="mt-4 overflow-auto rounded-3xl bg-[#0c0d11]/95 p-4 text-xs text-zinc-300">{`[
  {
    "query": "SELECT * FROM orders WHERE status = 'pending'",
    "plan": { "Node Type": "Seq Scan", "Relation Name": "orders" },
    "rows": 112345,
    "cost": 1324.78
  }
]
`}</pre>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
