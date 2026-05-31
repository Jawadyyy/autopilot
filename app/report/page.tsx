'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'

export default function ReportPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Performance Report</h1>
            <p className="text-slate-400 mt-2">Period: Oct 01, 2023 - Oct 31, 2023 • Instance: db-prod-cluster-01</p>
          </div>
          <button className="bg-white text-black hover:bg-slate-200 font-semibold py-2 px-6 rounded-lg transition">
            ↓ Export as PDF
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <p className="text-slate-400 text-sm uppercase">Overall Health Score</p>
            <p className="text-5xl font-bold text-green-400 mt-3">94%</p>
            <p className="text-slate-400 text-xs mt-3">↑ 3.2% vs last month</p>
          </div>

          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-white font-semibold">99.98%</span>
                </div>
                <div className="w-full bg-[#0a0f1a] rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.98%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Throttling</span>
                  <span className="text-white font-semibold">0.02%</span>
                </div>
                <div className="w-full bg-[#0a0f1a] rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '0.02%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Autopilot Optimization Impact</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Total Latency Saved</span>
                <span className="text-green-400 font-bold">1,420 hrs</span>
              </div>
              <p className="text-xs text-slate-500">Aggregated monthly saving</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Indexes Rebuilt</span>
                <span className="text-white font-bold">42</span>
              </div>
              <p className="text-xs text-slate-500">10 Created, 30 Merged</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">CPU Cycle Recovery</span>
                <span className="text-white font-bold">28%</span>
              </div>
              <p className="text-xs text-slate-500">Reduced peak utilization</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Top 10 Performance Gains: Before vs After</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">QUERY SIGNATURE</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">CALL FREQUENCY</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">BASELINE (AVG)</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">OPTIMIZED (AVG)</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">IMPROVEMENT</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">ACTION TAKEN</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { query: 'SELECT * FROM orders WHERE...', freq: '1.2N / day', baseline: '420ms', optimized: '12ms', improvement: '97.1%', action: 'Index change' },
                  { query: 'UPDATE inventory SET stock =...', freq: '840k / day', baseline: '85ms', optimized: '4ms', improvement: '95.2%', action: 'Trigger update' },
                  { query: 'SELECT u.name, p.title FROM...', freq: '245K / day', baseline: '1.2s', optimized: '88ms', improvement: '92.6%', action: 'Partition maintenance' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition">
                    <td className="py-3 px-4 text-white text-xs font-mono">{row.query}</td>
                    <td className="py-3 px-4 text-slate-300">{row.freq}</td>
                    <td className="py-3 px-4 text-slate-300">{row.baseline}</td>
                    <td className="py-3 px-4 text-green-400 font-semibold">{row.optimized}</td>
                    <td className="py-3 px-4 text-green-400 font-bold">{row.improvement}</td>
                    <td className="py-3 px-4">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Executive Observations</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-2xl font-semibold text-green-400">Done</span>
              <p className="text-slate-400"><span className="font-semibold text-white">Cache Hit Ratio Optimization:</span> Increased global cache hit ratio from 64% to 96% by introducing covering indexes on high-intensity reads.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl font-semibold text-green-400">Done</span>
              <p className="text-slate-400"><span className="font-semibold text-white">Infrastructure Cost Reduction:</span> 2-node scale-down allowed for cost savings of $1,400/mo while maintaining SLA compliance (99.99%).</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
