import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function BackupPage() {
  return (
    <AppShell>
      <PageHeader
        title="Backup & Recovery Console"
        description="Manage backup history, trigger immediate backups, and review point-in-time recovery progress."
      />

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Backup history</h2>
              <p className="mt-2 text-sm text-zinc-400">Latest backups for connected databases and recovery readiness.</p>
            </div>
            <button className="inline-flex rounded-3xl bg-[#c92f41] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff6f3d]/90">
              Backup now
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-white/10 bg-[#111317]/95 text-xs uppercase tracking-[0.22em] text-zinc-500">
                <tr>
                  <th className="px-5 py-4">Database</th>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Size</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { db: 'analytics', time: '2026-05-27 23:40', size: '1.2 GB', status: 'Success' },
                  { db: 'orders', time: '2026-05-27 22:10', size: '840 MB', status: 'Success' },
                  { db: 'inventory', time: '2026-05-27 21:05', size: '480 MB', status: 'Failed' },
                ].map((row) => (
                  <tr key={row.time} className="border-b border-white/10 last:border-none">
                    <td className="px-5 py-4 text-white">{row.db}</td>
                    <td className="px-5 py-4">{row.time}</td>
                    <td className="px-5 py-4">{row.size}</td>
                    <td className={`px-5 py-4 font-semibold ${row.status === 'Success' ? 'text-emerald-300' : 'text-[#ff6f3d]'}`}>{row.status}</td>
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
