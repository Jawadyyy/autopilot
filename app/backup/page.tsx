'use client'

import { useState } from 'react'
import AppShell from '../components/AppShell'
import { BACKUP_HISTORY } from '@/lib/mockData'

export default function BackupPage() {
  const [backups] = useState(BACKUP_HISTORY)

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Backup & Recovery Console</h1>
            <p className="text-slate-400 mt-2">Protect cluster state with PITR and automated WAL archiving.</p>
          </div>
          <button className="bg-[#2f75ff] hover:bg-[#4b8cff] text-white font-semibold py-2 px-6 rounded-lg transition">
            Run Backup Now
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">PITR ENABLED</p>
            <p className="text-sm font-semibold text-green-400 mt-2">Ready</p>
            <p className="text-xs text-slate-500 mt-1">RPO {'<'} 5 SEC</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Last Backup</p>
            <p className="text-sm font-semibold text-white mt-2">5 minutes ago</p>
            <p className="text-xs text-slate-500 mt-1">42.8 GB</p>
          </div>
          <div className="bg-[#0c1628] border border-white/10 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase">Stored</p>
            <p className="text-sm font-semibold text-white mt-2">AWS S3 (us-east-1)</p>
            <p className="text-xs text-slate-500 mt-1">128GB available</p>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Point-in-Time Restore</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400">Target: 2023-11-24 09:12:64 UTC</label>
              <input type="datetime-local" className="w-full mt-2 bg-black/30 border border-white/10 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400">LSN Offset</label>
              <input type="text" placeholder="0/1CA4296F0" className="w-full mt-2 bg-black/30 border border-white/10 rounded p-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Data Integrity</label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-green-400 text-sm">VERIFIED</span>
                <span className="text-xs text-slate-500">Last check: now</span>
              </div>
            </div>
          </div>
          <button className="mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition">
            Restore from Point
          </button>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">Backup History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">TIMESTAMP (UTC)</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">TYPE</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">SIZE</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">DURATION</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">STATUS</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">STORAGE</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, i) => (
                  <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition">
                    <td className="py-3 px-4 text-white text-xs">{backup.timestamp}</td>
                    <td className="py-3 px-4 text-slate-300 text-xs">{backup.type}</td>
                    <td className="py-3 px-4 text-slate-300">{backup.size}</td>
                    <td className="py-3 px-4 text-slate-300">{backup.duration}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                        {backup.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{backup.storage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0c1628] border border-white/10 rounded-[1.5rem] p-6">
          <h3 className="text-white font-semibold mb-4">WAL LOG REPLAY STREAM</h3>
          <div className="bg-black/20 p-4 rounded font-mono text-xs text-slate-400 max-h-40 overflow-y-auto">
            <p className="text-slate-500">[09:12:01] Initializing WAL segment fetch from S3 archive ...</p>
            <p className="text-slate-500">[09:12:02] Fetched segment 00000001000000080000004A1</p>
            <p className="text-slate-500">[09:12:02] Replaying transaction LSN 0/1CA4296F0 (UPDATE accounts SET balance = balance...)</p>
            <p className="text-slate-500">[09:12:03] Consistency check passed for block 46192</p>
            <p className="text-slate-500">[09:12:11] Reach target timeline point. Recovery successful.</p>
            <p className="text-green-400">Ready for connection ...</p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
