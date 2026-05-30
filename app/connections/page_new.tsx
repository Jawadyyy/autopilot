'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { CONNECTIONS } from '@/lib/mockData'

export default function ConnectionsPage() {
  const [connections] = useState(CONNECTIONS)

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Connection Manager</h1>
            <p className="text-slate-400 mt-2">Manage and monitor active database instances across your multi-cloud infrastructure.</p>
          </div>
          <button className="bg-[#2f75ff] hover:bg-[#4b8cff] text-white font-semibold py-2 px-6 rounded-lg transition">
            Register New Database
          </button>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">NAME</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">TYPE</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">HOST</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">STATUS</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">LAST CHECKED</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {connections.map(conn => (
                <tr key={conn.id} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="py-3 px-4 text-white font-medium">{conn.name}</td>
                  <td className="py-3 px-4 text-slate-300">{conn.type === 'postgresql' ? 'PostgreSQL' : 'MSSQL'}</td>
                  <td className="py-3 px-4 text-slate-300">{conn.host}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      conn.status === 'connected' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {conn.status === 'connected' ? '● Connected' : '● Disconnected'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{new Date(conn.last_checked_at).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-[#2f75ff] hover:text-[#4b8cff] text-xs">Edit</button>
                      <button className="text-slate-500 hover:text-red-400 text-xs">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Instance Auto-Discovery</h3>
            <p className="text-slate-400 text-sm mb-4">DB Autopilot has detected 4 additional nodes in your local subnet. Connect them to start monitoring query execution plans across clusters.</p>
            <button className="bg-[#2f75ff] hover:bg-[#4b8cff] text-white font-semibold py-2 px-4 rounded-lg transition text-sm">
              Scan Subnet
            </button>
          </div>

          <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Connection Health</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Connected</span>
                <span className="text-green-400 font-semibold">3 / 3</span>
              </div>
              <div className="w-full bg-[#0a0f1a] rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
