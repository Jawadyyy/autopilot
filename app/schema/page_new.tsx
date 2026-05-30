'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { SCHEMA_TABLES } from '@/lib/mockData'

export default function SchemaPage() {
  const [tables] = useState(SCHEMA_TABLES)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const totalBloat = tables.reduce((sum, t) => sum + (t.size_mb * t.bloat_ratio / 100), 0)
  const totalDeadTuples = tables.reduce((sum, t) => sum + t.dead_tuples, 0)

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Public Schema Tables</h1>
          <p className="text-slate-400 mt-2">Analyzing 40 tables for health and performance bottlenecks.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Total Bloat</p>
            <p className="text-2xl font-bold text-white mt-2">{totalBloat.toFixed(1)} GB</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Dead Tuples</p>
            <p className="text-2xl font-bold text-orange-400 mt-2">{(totalDeadTuples / 1000000).toFixed(1)}M</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Index Coverage</p>
            <p className="text-2xl font-bold text-white mt-2">92%</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Vacuum Health</p>
            <p className="text-2xl font-bold text-green-400 mt-2">Optimal</p>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <div className="flex gap-4 mb-4">
            <button className="px-4 py-2 rounded-lg bg-[#2f75ff] text-white text-sm font-semibold">
              Filter Health
            </button>
            <button className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition">
              Analyze All
            </button>
            <button className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm font-semibold hover:bg-white/10 transition">
              Run Vacuum Analyze
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">TABLE NAME</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">ROW COUNT</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">SIZE</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">BLOAT %</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">DEAD TUPLES</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">LAST VACUUM</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedTable(table.name)}
                    className={`border-b border-white/10 hover:bg-white/5 transition cursor-pointer ${
                      selectedTable === table.name ? 'bg-[#2f75ff]/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-white font-medium">{table.name}</td>
                    <td className="py-3 px-4 text-slate-300">{(table.row_count / 1000000).toFixed(1)}M</td>
                    <td className="py-3 px-4 text-slate-300">{table.size_mb} MB</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        table.bloat_ratio > 20 ? 'bg-red-500/20 text-red-300' :
                        table.bloat_ratio > 10 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {table.bloat_ratio}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{(table.dead_tuples / 1000).toFixed(0)}K</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{table.last_vacuum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTable && (
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h3 className="text-white font-semibold mb-4">Table Details: {selectedTable}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Indexes</p>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-slate-300">idx_{selectedTable}_id (Primary Key)</div>
                  <div className="text-xs text-slate-300">idx_{selectedTable}_created_at (B-tree)</div>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Recommendations</p>
                <div className="mt-2">
                  <button className="text-[#2f75ff] hover:text-[#4b8cff] text-xs">
                    Run Vacuum Analyze
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
