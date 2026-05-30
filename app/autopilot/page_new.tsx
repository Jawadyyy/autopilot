'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { AUTOPILOT_RULES } from '@/lib/mockData'

export default function RulesPage() {
  const [rules] = useState(AUTOPILOT_RULES)

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Autopilot Rules Engine</h1>
            <p className="text-slate-400 mt-2">Configure the logic governing automated performance tuning and database healing.</p>
          </div>
          <button className="bg-[#2f75ff] hover:bg-[#4b8cff] text-white font-semibold py-2 px-6 rounded-lg transition">
            + Add Custom Rule
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs">ACTIVE: 12 RULES</p>
            <p className="text-2xl font-bold text-white mt-2">{rules.filter(r => r.status === 'active').length}</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Storage Saved</p>
            <p className="text-2xl font-bold text-green-400 mt-2">42.8 GB</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Avg Latency Drop</p>
            <p className="text-2xl font-bold text-white mt-2">18ms</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Pending Tasks</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">3</p>
          </div>
        </div>

        <div className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6 hover:border-[#2f75ff]/30 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{rule.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      rule.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/20 text-slate-300'
                    }`}>
                      {rule.status === 'active' ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      rule.mode === 'auto' ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {rule.mode.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    <span className="font-semibold">Trigger:</span> {rule.trigger_condition}
                  </p>
                  <p className="text-slate-400 text-sm">
                    <span className="font-semibold">Action:</span> {rule.action_description}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-slate-400">Success Count</p>
                  <p className="text-lg font-bold text-green-400 mt-1">{rule.success_count}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Fail Count</p>
                  <p className="text-lg font-bold text-red-400 mt-1">{rule.fail_count}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Success Rate</p>
                  <p className="text-lg font-bold text-blue-400 mt-1">
                    {Math.round((rule.success_count / (rule.success_count + rule.fail_count)) * 100)}%
                  </p>
                </div>
                <div className="text-right">
                  <button className="text-[#2f75ff] hover:text-[#4b8cff] text-sm">Edit</button>
                  <button className="text-slate-500 hover:text-red-400 text-sm ml-4">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
