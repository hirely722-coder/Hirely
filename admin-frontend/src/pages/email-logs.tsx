import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Mail, Search, RefreshCw, Send, AlertTriangle, 
  CheckCircle2, ArrowRightLeft, X, Eye
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminEmailLogs() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const loadEmailLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/email-logs');
      setLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load email logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmailLogs();
  }, []);

  const handleRetry = async (log: any) => {
    try {
      showToast(`🔄 Retrying dispatch for ticket ${log.id}...`, 'success');
      const updated = await fetchAdminApi(`/api/superadmin/email-logs/${log.id}/retry`, { method: 'POST' });
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, ...updated } : l));
      showToast('✓ Email sent successfully on retry!');
    } catch (err: any) {
      showToast(err.message || 'Failed to retry email sending', 'error');
    }
  };

  // Filter & Search logic
  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.recipient.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.sender.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Email Logs Ledger</h1>
          <p className="text-xs text-slate-500 font-medium">Trace all outbound notifications, monitor bounces, and retry failed candidate emails.</p>
        </div>
        <button 
          onClick={loadEmailLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by recipient, sender, or subject keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Sent">Sent</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
              <option value="Bounced">Bounced</option>
              <option value="Spam">Spam</option>
            </select>
          </div>
        </div>
      </div>

      {/* Email Logs Grid table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading system mail logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No outbound mail records match the search filter.</div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Sender</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-400 text-[10px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 text-[11px] whitespace-nowrap">{log.sender}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-[11px] whitespace-nowrap">{log.recipient}</td>
                    <td className="px-6 py-4 max-w-xs truncate font-display font-semibold text-slate-800">{log.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        log.status === 'Delivered' || log.status === 'Sent'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                          : log.status === 'Failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-100/50'
                            : log.status === 'Bounced'
                              ? 'bg-amber-50 text-amber-700 border-amber-100/50'
                              : 'bg-slate-50 text-slate-700 border-slate-200/50'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="View Message Body"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {log.status === 'Failed' && (
                          <button
                            onClick={() => handleRetry(log)}
                            className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/50 px-2 py-0.5 rounded border border-indigo-100 cursor-pointer"
                            title="Retry Dispatch"
                          >
                            <Send className="h-3 w-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View Email Content Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">Outbound Email Detail</h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender</span>
                  <span className="font-mono text-slate-800 text-[11px]">{selectedLog.sender}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient</span>
                  <span className="font-mono text-slate-800 text-[11px]">{selectedLog.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className="font-bold text-slate-800 text-[10px]">{selectedLog.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject</span>
                <p className="font-bold text-slate-900 font-display text-sm mt-1">{selectedLog.subject}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Message Body</span>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-sans text-slate-700 min-h-[120px] max-h-[250px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedLog.body}
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="flex gap-2.5 bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-[10px] font-semibold text-rose-700 leading-normal">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider">MTA Error Message</span>
                    <span className="font-mono mt-0.5 block">{selectedLog.errorMessage}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
