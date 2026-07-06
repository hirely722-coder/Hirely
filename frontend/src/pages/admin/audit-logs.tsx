import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Shield, RefreshCw, Search, Calendar,
  ArrowRightLeft, User, Eye, Download, Info
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AdminAuditLogs() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/audit-logs');
      setLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleExportCSV = () => {
    const headers = 'Timestamp,Actor,Role Change,Workspace,IP Address,Browser\n';
    const rows = filteredLogs.map(l => 
      `"${l.timestamp}","${l.changedByName}","${l.action || 'Role Modified'}","${l.agencyName}","${l.ipAddress}","${l.browser}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hirely_audit_logs_${Date.now()}.csv`;
    link.click();
  };

  const filteredLogs = logs.filter(l => {
    return l.changedByName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           l.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (l.action && l.action.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">System Audit Ledger</h1>
          <p className="text-xs text-slate-500 font-medium">Trace all administrator changes, license switches, and access level alterations globally.</p>
        </div>
        <button 
          onClick={loadAuditLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Export Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor name, action description, or workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
          />
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Audit Logs table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading system audits...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No audit records found matching criteria.</div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Workspace</th>
                  <th className="px-6 py-4">Target User</th>
                  <th className="px-6 py-4 font-mono">IP Address</th>
                  <th className="px-6 py-4">Device Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-400 text-[10px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-display whitespace-nowrap">{log.changedByName}</td>
                    <td className="px-6 py-4 max-w-xs leading-normal">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{log.action || 'Role Permission Modified'}</span>
                        {log.newRole && (
                          <span className="font-mono text-[9px] text-slate-400 mt-0.5 truncate max-w-[200px]">New: {log.newRole}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">{log.agencyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.targetUserName}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{log.ipAddress}</td>
                    <td className="px-6 py-4 text-slate-400 max-w-[150px] truncate" title={`${log.browser} on ${log.device}`}>
                      {log.browser} on {log.device}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
