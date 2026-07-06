import React from 'react';
import { ShieldCheck, History, ArrowRight, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function SettingsSecurityLogsTab() {
  const { rbacAuditLogs, currentUserRole } = useApp();

  const isViewer = currentUserRole === 'Viewer';

  if (isViewer) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-slate-200/60 rounded-xl bg-slate-50/20 text-center min-h-[300px]" id="settings-security-logs-tab">
        <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          You do not have permission to view security logs. Please contact your workspace administrator.
        </p>
      </div>
    );
  }

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('invited') || act.includes('created')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (act.includes('removed') || act.includes('deleted')) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (act.includes('toggles') || act.includes('lock')) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  return (
    <div className="space-y-6" id="settings-security-logs-tab">
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-md font-bold text-slate-900 font-sans">Security Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of permissions adjustments, role modifications, and global lock activations.</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
          <History className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 font-semibold text-slate-500 font-sans">
                <th className="p-3.5 pl-4 w-[160px]">Timestamp</th>
                <th className="p-3.5 w-[140px]">Event Action</th>
                <th className="p-3.5">Target Affected</th>
                <th className="p-3.5">Change Details</th>
                <th className="p-3.5 pr-4 w-[150px]">Initiated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rbacAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    No security events logged yet. Role and lock changes will appear here.
                  </td>
                </tr>
              ) : (
                rbacAuditLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3.5 pl-4 font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      {/* Action Badge */}
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-semibold ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="p-3.5 font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{log.targetUserName || 'Workspace settings'}</span>
                        </div>
                      </td>

                      {/* Change details */}
                      <td className="p-3.5 text-slate-500 max-w-[200px] truncate">
                        {log.previousRole && log.newRole ? (
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <span className="px-1.5 py-0.25 bg-slate-100 rounded text-slate-600">{log.previousRole}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="px-1.5 py-0.25 bg-blue-50 border border-blue-100 rounded text-blue-700 font-semibold">{log.newRole}</span>
                          </div>
                        ) : log.newRole ? (
                          <span className="font-mono text-[10px] px-1.5 py-0.25 bg-blue-50 border border-blue-100 rounded text-blue-700 font-semibold">{log.newRole}</span>
                        ) : log.previousRole ? (
                          <span className="font-mono text-[10px] px-1.5 py-0.25 bg-slate-100 rounded text-slate-600">{log.previousRole}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium font-sans">Settings toggled</span>
                        )}
                      </td>

                      {/* Initiator */}
                      <td className="p-3.5 pr-4 text-slate-600 font-semibold">
                        {log.changedByName || 'System'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
