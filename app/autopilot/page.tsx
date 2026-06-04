'use client'

import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { apiFetch } from '@/lib/api'

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRules() {
      try {
        const data = await apiFetch('/api/autopilot?type=rules')
        setRules(data)
      } catch (err) {
        console.error('Failed to load rules', err)
      } finally {
        setLoading(false)
      }
    }

    loadRules()
  }, [])

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Autopilot Rules Engine</h1>
            <p className="text-slate-500 mt-2">Configure the logic governing automated performance tuning and database healing.</p>
          </div>
          <button className="bg-[#2f6bff] hover:bg-[#1f54e0] text-white font-semibold py-2 px-5 rounded-lg transition shadow-sm">
            + Add Custom Rule
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Active Rules</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{rules.filter(r => r.is_active).length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Auto-Fix Rules</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{rules.filter(r => r.mode === 'auto').length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Fixes Applied</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{rules.reduce((s, r) => s + Number(r.success_count ?? 0), 0)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">Suggest-Only</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{rules.filter(r => r.mode === 'suggest').length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading rules...</div>
        ) : (
          <div className="space-y-4">
            {rules.map(rule => (
              <div key={rule.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-slate-900 font-semibold">{rule.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        rule.mode === 'auto' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rule.mode?.toUpperCase() ?? 'UNKNOWN'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">
                      <span className="font-semibold text-slate-700">Trigger:</span> {rule.trigger_condition}
                    </p>
                    <p className="text-slate-500 text-sm">
                      <span className="font-semibold text-slate-700">Action:</span> {rule.action_description}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Success Count</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{rule.success_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Fail Count</p>
                    <p className="text-lg font-bold text-red-600 mt-1">{rule.fail_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Success Rate</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      {rule.success_count + rule.fail_count > 0
                        ? `${Math.round((rule.success_count / (rule.success_count + rule.fail_count)) * 100)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <button className="text-[#2f6bff] hover:text-[#1f54e0] text-sm font-medium">Edit</button>
                    <button className="text-slate-400 hover:text-red-600 text-sm font-medium ml-4">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
