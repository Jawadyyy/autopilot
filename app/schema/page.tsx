import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function SchemaPage() {
  return (
    <AppShell>
      <PageHeader
        title="Schema Browser"
        description="Browse tables, columns, constraints, indexes, and health metrics for registered connections."
      />

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0d0f14]/90 p-5">
              <h2 className="text-lg font-semibold text-white">Selected database</h2>
              <p className="mt-3 text-sm text-zinc-400">postgres_custom</p>
              <p className="mt-4 text-sm text-zinc-300">Explore tables, columns, indexes, and schema health metrics from the connected store.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0d0f14]/90 p-5">
              <h2 className="text-lg font-semibold text-white">Table health</h2>
              <p className="mt-3 text-sm text-zinc-400">orders</p>
              <p className="mt-4 text-sm text-zinc-300">Bloat: 12%, dead tuples: 24k, last vacuum: 2h ago</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-zinc-300">
              <thead className="border-b border-white/10 bg-[#111317]/95 text-xs uppercase tracking-[0.22em] text-zinc-500">
                <tr>
                  <th className="px-5 py-4">Table</th>
                  <th className="px-5 py-4">Rows</th>
                  <th className="px-5 py-4">Indexes</th>
                  <th className="px-5 py-4">Health</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { table: 'orders', rows: '1.2M', indexes: '5', health: 'Needs vacuum' },
                  { table: 'customers', rows: '54k', indexes: '4', health: 'Good' },
                  { table: 'inventory', rows: '237k', indexes: '3', health: 'Review' },
                ].map((row) => (
                  <tr key={row.table} className="border-b border-white/10 last:border-none">
                    <td className="px-5 py-4 text-white">{row.table}</td>
                    <td className="px-5 py-4">{row.rows}</td>
                    <td className="px-5 py-4">{row.indexes}</td>
                    <td className="px-5 py-4 text-sm text-zinc-300">{row.health}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
