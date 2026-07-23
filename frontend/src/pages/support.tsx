import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, AlertCircle, RefreshCw, Send, Plus, 
  HelpCircle, Clock, CheckCircle2, ShieldAlert, Sparkles, X, ChevronRight, Check
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import AnimatedModal from '@/components/AnimatedModal';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: string;
  attachment?: string;
}

export default function SupportPage() {
  const { showToast, token } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Submit Ticket Form State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState<string>('');

  // Ticket Inspection Modal State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/support', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to load support tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, description, priority, attachment })
      });
      if (!res.ok) throw new Error('Failed to submit support ticket');
      const newTicket = await res.json();
      setTickets(prev => [newTicket, ...prev]);
      showToast('✓ Support ticket submitted successfully!', 'success');
      
      // Reset form
      setSubject('');
      setDescription('');
      setPriority('Medium');
      setAttachment('');
      setIsSubmitOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="support-view">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Support & Help Desk</h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Need assistance? Create a help ticket or review resolution progress of your existing requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchTickets}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Info block and List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Help Center FAQs and Cards (4-span) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Smart AI helper tips */}
          <section className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-100 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-blue-900 font-display flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
              Recruiter Self-Service Help
            </h3>
            <p className="text-[11.5px] text-slate-600 mt-2.5 leading-relaxed font-sans">
              Welcome to the workspace support ticketing portal. Our dedicated help desk is synchronized directly with the platform administrators. Submit a ticket for assistance with subscriptions, workspace locked features, user roles setup, or custom domains configuration.
            </p>
          </section>

          {/* Quick FAQ block */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 font-display text-sm">Common Questions</h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>How long do replies take?</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 pl-5 leading-normal">
                  Superadmins typically respond to high priority tickets within 1-2 business hours.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Can I upgrade plan here?</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 pl-5 leading-normal">
                  Yes, you can also upgrade automatically on the Dashboard page or request custom pricing tiers via a ticket.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Support Tickets List (8-span) */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-bold text-slate-900 font-display text-sm">Your Ticket History</h2>
              </div>
            </div>

            <div className="divide-y divide-slate-150 bg-white">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading tickets database...
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  You have not submitted any support tickets yet. Click "Submit Ticket" to get started.
                </div>
              ) : (
                tickets.map((t) => (
                  <div 
                    key={t.id} 
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(t)}
                  >
                    <div className="min-w-0 space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                          ID: {t.id.substring(0, 8)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          t.priority === 'High' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                            : t.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}>
                          {t.priority} Priority
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 font-display truncate leading-snug">{t.subject}</h4>
                      <p className="text-[11px] text-slate-500 truncate leading-relaxed">
                        {t.description}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Submitted: {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0 self-end sm:self-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'Open'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : t.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {t.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

      </div>

      {/* Ticket Create Form Modal */}
      <AnimatedModal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)}>
        {(animate) => (
          <div 
            className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmitTicket}>
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Create Help Desk Ticket</h4>
                <button type="button" onClick={() => setIsSubmitOpen(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Subject Topic *</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Detailed Description *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide all context, steps to reproduce, or upgrade/billing details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-sans resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                <button 
                  type="button" 
                  onClick={() => setIsSubmitOpen(false)} 
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}
      </AnimatedModal>

      {/* Ticket Details Inspection Modal */}
      <AnimatedModal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)}>
        {(animate) => (
          <div 
            className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedTicket && (
              <>
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Ticket Progress Details</h4>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {selectedTicket.id}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs leading-relaxed">
                  <div className="flex gap-3 items-center flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedTicket.priority === 'High' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                        : selectedTicket.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {selectedTicket.priority} Priority
                    </span>
                    
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedTicket.status === 'Open'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : selectedTicket.status === 'In Progress'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {selectedTicket.status}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono ml-auto">
                      Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Subject</span>
                    <p className="font-bold text-slate-900 text-sm mt-1">{selectedTicket.subject}</p>
                  </div>

                  <div>
                    <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Conversation History</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-sans text-slate-700 mt-1 max-h-[220px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.description}
                    </div>
                  </div>

                  {selectedTicket.attachment && (
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Screenshot Attachment</span>
                      <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden max-h-[220px]">
                        <img 
                          src={selectedTicket.attachment} 
                          alt="Screenshot Attachment" 
                          className="w-full h-auto object-contain bg-slate-50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50">
                  <button 
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg cursor-pointer hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    Dismiss Details
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </AnimatedModal>

    </div>
  );
}
