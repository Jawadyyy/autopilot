import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'

export default function OlapPage() {
  return (
    <AppShell>
      <PageHeader
        title="OLAP Incident Analytics"
        description="Trend incidents over time, pivot by database, issue type, and hour using CUBE and ROLLUP style insights."
      />

      <div className="grid min-w-0 gap-6">
        <section className="min-w-0 rounded-[2rem] border border-white/10 bg-[#101115]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.23)]">
          <div className="grid min-w-0 gap-6">
            <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95 p-6">
              <h2 className="text-lg font-semibold text-white">Incident heatmap</h2>
              <p className="mt-3 text-sm text-zinc-400">Hours of day vs day of week, highlighting peak problem windows.</p>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {Array.from({ length: 21 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-12 rounded-2xl ${index % 5 === 0 ? 'bg-[#ff6f3d]' : 'bg-white/5'}`}
                  />
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/95 p-6">
              <h2 className="text-lg font-semibold text-white">Pivot builder</h2>
              <p className="mt-3 text-sm text-zinc-400">Create custom analytics slices with database, issue category, and time dimension.</p>
              <div className="mt-5 overflow-x-auto rounded-3xl bg-[#111317]/95 p-4 text-sm text-zinc-300">
                <div className="min-w-max space-y-3">
                  <p><span className="font-semibold text-white">Rows:</span> database, issue type</p>
                  <p><span className="font-semibold text-white">Columns:</span> hour</p>
                  <p><span className="font-semibold text-white">Measures:</span> incident count, fix success rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 min-w-0 rounded-[1.75rem] border border-white/10 bg-[#111317]/95 p-5">
            <p className="text-sm text-zinc-300">Generated SQL</p>
            <div className="mt-3 overflow-x-auto rounded-3xl bg-[#0c0d11]/95 p-4 max-w-full">
              <pre className="min-w-max whitespace-pre text-xs text-zinc-300">SELECT database_name, issue_type, hour,
  COUNT(*) AS incident_count
FROM fact_incidents
GROUP BY CUBE (database_name, issue_type, hour)
ORDER BY incident_count DESC;
</pre>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
