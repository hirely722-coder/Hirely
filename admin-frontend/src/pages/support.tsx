import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Mail, MessageSquare, AlertCircle, RefreshCw, X, 
  Send, User, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminSupport() {
  const { showToast } = useApp();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Ticket Reply Modal
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/support');
      setTickets(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setSendingReply(true);
    try {
      await fetchAdminApi(`/api/superadmin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyMessage })
      });
      showToast('✓ Support response sent successfully!');
      
      // Update ticket status locally to In Progress
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'In Progress' } : t));
      
      setReplyMessage('');
      setSelectedTicket(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to send response', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolveTicket = async (ticket: any, nextStatus = 'Resolved') => {
    try {
      const updated = await fetchAdminApi(`/api/superadmin/support/${ticket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...updated } : t));
      showToast(`✓ Ticket marked as ${nextStatus}!`);
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update ticket status', 'error');
    }
  };

  // Filter logic
  const filteredTickets = tickets.filter(t => {
    return filterStatus === 'All' || t.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Support Tickets Center</h1>
          <p className="text-xs text-slate-500 font-medium">Coordinate client issue tickets, answer technical queries, and assign support agents.</p>
        </div>
        <button 
          onClick={loadTickets}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar Filter */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="All">All Tickets</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading support ticketing...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No support tickets match the filters.</div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-4">Ticket ID</th>
                  <th className="px-6 py-4">Agency</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-400 text-[10px]">{t.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-display">{t.agencyName}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 font-display">{t.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'High'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : t.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-50 text-slate-700 border border-slate-100'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-500">{t.assignedName}</td>
                    <td className="px-6 py-4 text-slate-400 font-semibold font-mono text-[10px]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'Open'
                          ? 'bg-rose-50 text-rose-700 border-rose-100/50'
                          : t.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-100/50'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 border border-blue-100 bg-blue-50 hover:bg-blue-100/50 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Reply</span>
                        </button>
                        {t.status !== 'Resolved' && (
                          <button
                            onClick={() => handleResolveTicket(t, 'Resolved')}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Resolve Ticket"
                          >
                            <CheckCircle2 className="h-4.5 w-4.5" />
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

      {/* Ticket Details & Reply Composer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Resolve Customer Ticket</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {selectedTicket.id}</p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl font-semibold">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">From Agency</span>
                  <span className="text-slate-800 text-[11px] font-bold">{selectedTicket.agencyName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Owner</span>
                  <span className="text-slate-800 text-[11px] font-bold">{selectedTicket.assignedName}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Topic Subject</span>
                <p className="font-bold text-slate-900 font-display text-sm mt-1">{selectedTicket.subject}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inquiry Description</span>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-sans text-slate-700 min-h-[80px] max-h-[160px] overflow-y-auto leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {selectedTicket.attachment && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attached Screenshot</span>
                  <div className="mt-1 border border-slate-200 rounded-2xl overflow-hidden max-h-[160px]">
                    <img 
                      src={selectedTicket.attachment} 
                      alt="User Attached Screenshot" 
                      className="w-full h-auto object-contain bg-slate-50 cursor-pointer"
                      onClick={() => window.open(selectedTicket.attachment, '_blank')}
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleSendReply} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Compose Support Response</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type your reply message here..."
                    value={replyMessage}
                    onChange={(e) => {
                      console.log('TYPING:', e.target.value);
                      setReplyMessage(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white resize-none leading-relaxed relative z-10"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100 justify-between items-center">
                  {selectedTicket.status !== 'Resolved' && (
                    <button
                      type="button"
                      onClick={() => handleResolveTicket(selectedTicket, 'Resolved')}
                      className="px-3 py-1.5 text-emerald-600 hover:text-emerald-700 border border-emerald-100 bg-emerald-50 hover:bg-emerald-100/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Mark as Resolved
                    </button>
                  )}
                  
                  <div className="flex gap-2.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
