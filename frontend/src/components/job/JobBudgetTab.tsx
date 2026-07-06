import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, Calendar, FileText, CheckCircle2, AlertCircle, 
  Edit2, ArrowRight, X, Clock, Plus, Trash2, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { Job, JobCandidate, Task } from '../../types';
import { useApp } from '../../context/AppContext';
import AnimatedModal from '../AnimatedModal';

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export function parseTransactions(notes: string | undefined): PaymentTransaction[] {
  if (!notes) return [];
  const trimmed = notes.trim();
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function getLegacyNotes(notes: string | undefined): string {
  if (!notes) return '';
  const trimmed = notes.trim();
  if (trimmed.startsWith('[')) {
    return '';
  }
  return notes;
}

interface JobBudgetTabProps {
  job: Job;
  jobCandidates: JobCandidate[];
  onRefresh: () => void;
  triggerToast: (msg: string) => void;
}

export function JobBudgetTab({
  job,
  jobCandidates,
  onRefresh,
  triggerToast
}: JobBudgetTabProps) {
  const { tasks, handleAddTask, handleUpdateTask } = useApp();
  const [editingCandidate, setEditingCandidate] = useState<JobCandidate | null>(null);

  // Extra state hooks for recording installments and row expansions
  const [recordingCandidate, setRecordingCandidate] = useState<JobCandidate | null>(null);
  const [recordAmount, setRecordAmount] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>('');
  const [recordNote, setRecordNote] = useState<string>('');
  const [expandedPlacements, setExpandedPlacements] = useState<Set<string>>(new Set());

  // Form states for modal
  const [totalFee, setTotalFee] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filter candidates in Selected or Joined stages
  const placements = useMemo(() => {
    return jobCandidates.filter(jc => jc.stage === 'Selected' || jc.stage === 'Joined');
  }, [jobCandidates]);

  // Calculations
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCollected = 0;
    placements.forEach(p => {
      totalRevenue += p.totalAgencyFee || 0;
      totalCollected += p.amountPaid || 0;
    });
    return {
      totalRevenue,
      totalCollected,
      outstanding: totalRevenue - totalCollected
    };
  }, [placements]);

  const handleEditClick = (jc: JobCandidate) => {
    setEditingCandidate(jc);
    setTotalFee(jc.totalAgencyFee?.toString() || '0');
    setPaidAmount(jc.amountPaid?.toString() || '0');
    setDueDate(jc.paymentDueDate || '');
    setNotes(getLegacyNotes(jc.paymentNotes));
  };

  const handleSave = async () => {
    if (!editingCandidate) return;

    const feeNum = parseFloat(totalFee) || 0;
    const paidNum = parseFloat(paidAmount) || 0;
    const unpaidNum = Math.max(0, feeNum - paidNum);

    let calculatedStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid' = 'Unpaid';
    if (feeNum > 0) {
      if (paidNum >= feeNum) {
        calculatedStatus = 'Fully Paid';
      } else if (paidNum > 0) {
        calculatedStatus = 'Partially Paid';
      }
    }

    const existingTxs = parseTransactions(editingCandidate.paymentNotes);
    const sumTxs = existingTxs.reduce((sum, tx) => sum + tx.amount, 0);

    let finalNotes = notes;
    if (existingTxs.length > 0 && paidNum === sumTxs) {
      // Keep JSON transactions, just reserialize them
      finalNotes = JSON.stringify(existingTxs);
    } else if (paidNum > 0) {
      // Reset or override with a single manual transaction representing this payment override
      const resetTxs: PaymentTransaction[] = [
        {
          id: 'tx_override_' + Date.now(),
          date: new Date().toISOString().split('T')[0],
          amount: paidNum,
          note: notes || 'Manual payment override'
        }
      ];
      finalNotes = JSON.stringify(resetTxs);
    } else {
      // If paid amount is 0, clear transaction history
      finalNotes = '';
    }

    setIsSaving(true);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Save payment details in job_candidates table
      const res = await fetch(`/api/job-candidates/${editingCandidate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          totalAgencyFee: feeNum,
          amountPaid: paidNum,
          paymentDueDate: dueDate || null,
          paymentNotes: finalNotes,
          paymentStatus: calculatedStatus
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update placement details');
      }

      // 2. Automate task integration
      const candidateName = editingCandidate.candidate?.name || 'Candidate';
      const existingCollectionTask = tasks.find(t => 
        t.candidateId === editingCandidate.candidateId && 
        t.title.includes('[Collection]') && 
        t.status === 'Pending'
      );

      if (unpaidNum > 0) {
        // Create or update unpaid collection task
        const todayStr = new Date().toISOString().split('T')[0];
        const taskPayload = {
          title: `[Collection] Collect outstanding payment of ₹${unpaidNum.toLocaleString()} for ${candidateName}`,
          dueDate: dueDate || todayStr,
          priority: 'High' as const,
          description: `Placement fee payment collection tracking for job: ${job.title}.\nTotal placement fee: ₹${feeNum.toLocaleString()}\nAmount collected: ₹${paidNum.toLocaleString()}\nRemaining unpaid: ₹${unpaidNum.toLocaleString()}`,
          notes: notes
        };

        if (existingCollectionTask) {
          // Update existing task
          await handleUpdateTask({
            ...existingCollectionTask,
            ...taskPayload
          });
        } else {
          // Create new task
          const newTask: Task = {
            id: 't_' + Date.now(),
            type: 'Follow Up',
            title: taskPayload.title,
            candidateId: editingCandidate.candidateId,
            candidateName: candidateName,
            priority: 'High',
            status: 'Pending',
            dueDate: taskPayload.dueDate,
            description: taskPayload.description,
            notes: taskPayload.notes
          };
          await handleAddTask(newTask);
        }
        triggerToast(`✓ Collection task updated for ${candidateName} (Unpaid: ₹${unpaidNum.toLocaleString()})`);
      } else {
        // If paid completely, complete the collection task if it exists
        if (existingCollectionTask) {
          await handleUpdateTask({
            ...existingCollectionTask,
            status: 'Completed',
            notes: `Cleared balance fully! Final payment of ₹${paidNum.toLocaleString()} received.`
          });
          triggerToast(`✓ Collection task for ${candidateName} marked as Completed!`);
        }
      }

      triggerToast('✓ Placement payment details saved successfully!');
      onRefresh();
      setEditingCandidate(null);
    } catch (err: any) {
      console.error(err);
      triggerToast('Failed to save placement payment details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordPaymentClick = (jc: JobCandidate) => {
    setRecordingCandidate(jc);
    const unpaid = Math.max(0, (jc.totalAgencyFee || 0) - (jc.amountPaid || 0));
    setRecordAmount(unpaid.toString());
    setRecordDate(new Date().toISOString().split('T')[0]);
    setRecordNote('');
  };

  const handleSaveRecordPayment = async () => {
    if (!recordingCandidate) return;

    const amtNum = parseFloat(recordAmount) || 0;
    if (amtNum <= 0) {
      triggerToast('❌ Please enter a payment amount greater than 0.');
      return;
    }

    setIsSaving(true);
    try {
      const existingTxs = parseTransactions(recordingCandidate.paymentNotes);
      const newTx: PaymentTransaction = {
        id: 'tx_' + Date.now(),
        date: recordDate || new Date().toISOString().split('T')[0],
        amount: amtNum,
        note: recordNote
      };

      const updatedTxs = [...existingTxs, newTx];
      const totalPaid = updatedTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const feeNum = recordingCandidate.totalAgencyFee || 0;
      const unpaidNum = Math.max(0, feeNum - totalPaid);

      let calculatedStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid' = 'Unpaid';
      if (feeNum > 0) {
        if (totalPaid >= feeNum) {
          calculatedStatus = 'Fully Paid';
        } else if (totalPaid > 0) {
          calculatedStatus = 'Partially Paid';
        }
      }

      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/job-candidates/${recordingCandidate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amountPaid: totalPaid,
          paymentNotes: JSON.stringify(updatedTxs),
          paymentStatus: calculatedStatus
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save payment transaction');
      }

      // Update collection task
      const candidateName = recordingCandidate.candidate?.name || 'Candidate';
      const existingCollectionTask = tasks.find(t => 
        t.candidateId === recordingCandidate.candidateId && 
        t.title.includes('[Collection]') && 
        t.status === 'Pending'
      );

      if (unpaidNum > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const taskPayload = {
          title: `[Collection] Collect outstanding payment of ₹${unpaidNum.toLocaleString()} for ${candidateName}`,
          dueDate: recordingCandidate.paymentDueDate || todayStr,
          priority: 'High' as const,
          description: `Placement fee payment collection tracking for job: ${job.title}.\nTotal placement fee: ₹${feeNum.toLocaleString()}\nAmount collected: ₹${totalPaid.toLocaleString()}\nRemaining unpaid: ₹${unpaidNum.toLocaleString()}`,
          notes: `Logged payment of ₹${amtNum.toLocaleString()} on ${recordDate}. Ref: ${recordNote}`
        };

        if (existingCollectionTask) {
          await handleUpdateTask({ ...existingCollectionTask, ...taskPayload });
        } else {
          const newTask: Task = {
            id: 't_' + Date.now(),
            type: 'Follow Up',
            title: taskPayload.title,
            candidateId: recordingCandidate.candidateId,
            candidateName: candidateName,
            priority: 'High',
            status: 'Pending',
            dueDate: taskPayload.dueDate,
            description: taskPayload.description,
            notes: taskPayload.notes
          };
          await handleAddTask(newTask);
        }
        triggerToast(`✓ Collection task updated for ${candidateName} (Unpaid: ₹${unpaidNum.toLocaleString()})`);
      } else {
        if (existingCollectionTask) {
          await handleUpdateTask({
            ...existingCollectionTask,
            status: 'Completed',
            notes: `Cleared balance fully! Final payment of ₹${amtNum.toLocaleString()} received.`
          });
          triggerToast(`✓ Collection task for ${candidateName} marked as Completed!`);
        }
      }

      triggerToast(`✓ Recorded payment of ₹${amtNum.toLocaleString()} successfully!`);

      // Automatically expand the row
      const newExpanded = new Set(expandedPlacements);
      newExpanded.add(recordingCandidate.id);
      setExpandedPlacements(newExpanded);

      onRefresh();
      setRecordingCandidate(null);
    } catch (err: any) {
      console.error(err);
      triggerToast('Failed to record payment transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRowExpanded = (id: string) => {
    const newSet = new Set(expandedPlacements);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedPlacements(newSet);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-xs">
      <div className="border-b pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Placement Budget & Commission Tracker</h3>
          <p className="text-[10px] text-slate-404 mt-0.5">Track financial placements, collection statuses, and outstanding receivables for hired roles.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-404 uppercase tracking-wider block font-mono">Total Placement Revenue</span>
            <span className="text-lg font-bold text-slate-800">₹{stats.totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-emerald-50/20 border border-emerald-100/80 rounded-xl p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block font-mono">Total Payments Collected</span>
            <span className="text-lg font-bold text-slate-800">₹{stats.totalCollected.toLocaleString()}</span>
          </div>
        </div>

        <div className={stats.outstanding > 0 ? "bg-amber-50/20 border border-amber-100/80 rounded-xl p-4 flex items-center gap-3.5" : "bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3.5"}>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stats.outstanding > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-404 uppercase tracking-wider block font-mono">Outstanding Receivables</span>
            <span className={`text-lg font-bold ${stats.outstanding > 0 ? 'text-amber-600' : 'text-slate-550'}`}>
              ₹{stats.outstanding.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Table of placements */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-404 text-[10px] font-mono uppercase tracking-wider border-b border-slate-150 font-bold">
              <th className="p-3">Candidate Hired</th>
              <th className="p-3">Hiring Stage</th>
              <th className="p-3 text-right">Placement Fee</th>
              <th className="p-3 text-right">Amount Paid</th>
              <th className="p-3 text-right">Outstanding Unpaid</th>
              <th className="p-3">Payment Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {placements.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-404 italic font-sans">
                  No candidates hired for this position yet. Change candidates stage to Selected or Joined to add placements.
                </td>
              </tr>
            ) : (
              placements.map((jc) => {
                const unpaid = Math.max(0, (jc.totalAgencyFee || 0) - (jc.amountPaid || 0));
                return (
                  <React.Fragment key={jc.id}>
                    <tr className="hover:bg-slate-50/30">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleRowExpanded(jc.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title="Toggle payment history"
                          >
                            <ChevronDown 
                              className="h-3.5 w-3.5 transition-transform duration-200" 
                              style={{ transform: expandedPlacements.has(jc.id) ? 'rotate(180deg)' : 'none' }}
                            />
                          </button>
                          <div>
                            <div className="font-bold text-slate-900">{jc.candidate?.name || 'N/A'}</div>
                            <div className="text-[10px] text-slate-404 mt-0.5">{jc.candidate?.email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold text-[9px]">
                          {jc.stage}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-800">₹{(jc.totalAgencyFee || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-600">₹{(jc.amountPaid || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-semibold text-amber-600">₹{unpaid.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] rounded-full font-bold border ${
                          jc.paymentStatus === 'Fully Paid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : jc.paymentStatus === 'Partially Paid'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {jc.paymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleRecordPaymentClick(jc)}
                          className="px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-150 rounded transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Record Payment
                        </button>
                        <button
                          onClick={() => handleEditClick(jc)}
                          className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-150 rounded transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" /> Edit Details
                        </button>
                      </td>
                    </tr>
                    {expandedPlacements.has(jc.id) && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={7} className="p-4 border-t border-slate-100">
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                Payment History & Installment Ledger
                              </div>
                              {jc.paymentDueDate && (
                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  Payment Due: <span className="font-bold text-slate-700">{jc.paymentDueDate}</span>
                                </div>
                              )}
                            </div>

                            {parseTransactions(jc.paymentNotes).length === 0 ? (
                              <div className="text-center py-4 text-slate-400 italic">
                                No payment installments recorded yet. Use "Record Payment" to add payments.
                                {getLegacyNotes(jc.paymentNotes) && (
                                  <div className="mt-2 p-2 bg-slate-50 rounded border text-left not-italic text-slate-600 font-sans">
                                    <strong className="text-[10px] text-slate-400 uppercase block font-mono">Legacy Notes:</strong>
                                    {getLegacyNotes(jc.paymentNotes)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-[10.5px]">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-450 font-mono font-bold uppercase tracking-wider border-b border-slate-150">
                                        <th className="p-2 pl-3">Date</th>
                                        <th className="p-2">Transaction ID</th>
                                        <th className="p-2">Reference / Notes</th>
                                        <th className="p-2 text-right pr-3">Amount Paid</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {parseTransactions(jc.paymentNotes).map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50">
                                          <td className="p-2 pl-3 text-slate-550 font-medium">{tx.date}</td>
                                          <td className="p-2 font-mono text-slate-400 text-[9.5px]">{tx.id}</td>
                                          <td className="p-2 text-slate-600 font-sans leading-relaxed">{tx.note || <span className="italic text-slate-350">None</span>}</td>
                                          <td className="p-2 text-right pr-3 font-semibold font-mono text-emerald-600">₹{tx.amount.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {getLegacyNotes(jc.paymentNotes) && (
                                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
                                    <strong className="text-[9.5px] text-slate-400 uppercase block font-mono font-bold mb-0.5">Legacy Notes:</strong>
                                    <span className="text-slate-655 leading-relaxed font-sans">{getLegacyNotes(jc.paymentNotes)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Animated edit payment modal */}
      <AnimatedModal 
        isOpen={!!editingCandidate} 
        onClose={() => setEditingCandidate(null)}
      >
        {(animate) => (
          <div 
            className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IndianRupee className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Edit Placement Payment</h3>
                  <p className="text-[10px] text-slate-404 font-mono font-bold">Candidate: {editingCandidate?.candidate?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingCandidate(null)} 
                className="p-1 text-slate-444 hover:text-slate-655 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inputs */}
            <div className="p-5 space-y-3.5 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Total Placement Fee (₹)</label>
                <input 
                  type="number" 
                  value={totalFee}
                  onChange={(e) => setTotalFee(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Amount Paid (₹)</label>
                <input 
                  type="number" 
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="e.g. 3000"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Payment Due Date</label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Payment Notes / Invoice Details</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Invoice #INV-2026-004 sent. Awaiting bank transfer."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none h-16 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
              <button 
                onClick={() => setEditingCandidate(null)}
                className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-655 rounded-lg hover:bg-slate-55 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer select-none font-sans"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Animated Record Payment Modal */}
      <AnimatedModal 
        isOpen={!!recordingCandidate} 
        onClose={() => setRecordingCandidate(null)}
      >
        {(animate) => (
          <div 
            className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Record Payment Transaction</h3>
                  <p className="text-[10px] text-slate-404 font-mono font-bold">Candidate: {recordingCandidate?.candidate?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setRecordingCandidate(null)} 
                className="p-1 text-slate-444 hover:text-slate-655 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inputs */}
            <div className="p-5 space-y-3.5 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Amount Paid (₹)</label>
                <input 
                  type="number" 
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Remaining unpaid: ₹{Math.max(0, (recordingCandidate?.totalAgencyFee || 0) - (recordingCandidate?.amountPaid || 0)).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Payment Date</label>
                <input 
                  type="date" 
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Transaction Reference Notes</label>
                <textarea 
                  value={recordNote}
                  onChange={(e) => setRecordNote(e.target.value)}
                  placeholder="e.g. GPay reference #9182348, Cheque #0918, or direct bank transfer confirmation."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none h-16 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
              <button 
                onClick={() => setRecordingCandidate(null)}
                className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-655 rounded-lg hover:bg-slate-55 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRecordPayment}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer select-none font-sans"
              >
                {isSaving ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
}
