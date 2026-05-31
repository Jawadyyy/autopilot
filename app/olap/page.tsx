'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'

export default function OLAPPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">OLAP Incident Analytics</h1>
          <p className="text-slate-400 mt-2">Visualizing long-term infrastructure health and incident correlation.</p>
        </div>

        <div className="flex gap-4 mb-4">
          <select className="px-4 py-2 bg-[#0c1628] border border-white/10 rounded text-white">
            <option>Last 180 Days</option>
            <option>Last 90 Days</option>
            <option>Last 30 Days</option>
          </select>
          <button className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition">
            ↓ Export
          </button>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Incident Volume vs. Fix Success</h3>
          <div className="flex h-48 items-end gap-2 px-4 py-8 bg-black/20 rounded">
            {[45, 38, 52, 48, 61, 55, 42].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-end">
                <div className="w-full rounded-t bg-gradient-to-t from-[#2f75ff] to-[#7faaff]/30" style={{ height: `${v}%` }}></div>
                <div className="w-full rounded-t bg-gradient-to-t from-green-500 to-green-500/30 mt-1" style={{ height: `${v * 0.8}%` }}></div>
                <p className="text-xs text-slate-400 mt-2">{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'][i]}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#2f75ff]"></div>
              <span className="text-slate-400">Total Incidents</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-400">Fix Success Rate %</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h3 className="text-white font-semibold mb-4">Incidents: Hour vs. Day</h3>
            <div className="space-y-1">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                <div key={day} className="flex items-center gap-2">
                  <p className="text-sm text-slate-400 w-12">{day}</p>
                  <div className="flex gap-1 flex-1">
                    {Array(24).fill(0).map((_, h) => (
                      <div key={h} className={`flex-1 h-8 rounded-sm ${
                        Math.random() > 0.5 ? 'bg-[#2f75ff]/50' : 'bg-[#2f75ff]/20'
                      }`}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">High Frequency: More intense color</p>
          </div>

          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h3 className="text-white font-semibold mb-4">Pivot Dimension Builder</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400 mb-2">Available Dimensions</p>
                <div className="flex flex-wrap gap-2">
                  {['Database', 'Region', 'Severity'].map(dim => (
                    <span key={dim} className="text-xs bg-[#2f75ff]/20 text-[#8ab9ff] px-3 py-1 rounded cursor-pointer hover:bg-[#2f75ff]/30">
                      {dim} ✕
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Rows</p>
                <span className="text-xs bg-white/10 text-white px-3 py-1 rounded">
                  Issue Type ✕
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Columns</p>
                <span className="text-xs bg-white/10 text-white px-3 py-1 rounded">
                  Table Name ✕
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
