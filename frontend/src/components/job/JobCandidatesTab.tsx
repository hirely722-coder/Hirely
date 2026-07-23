import React, { useState } from 'react';
import { Eye, Mail, Phone, Plus, RefreshCw, Loader2, X, Search } from 'lucide-react';
import { Job, Candidate, JobCandidate } from '../../types';
import { supabase } from '../../utils/supabase';
import { Select } from '../ui/Select';

interface JobCandidatesTabProps {
  job: Job;
  jobCandidates: JobCandidate[];
  isLoading: boolean;
  onRefresh: () => void;
  allCandidates: Candidate[];
  setViewedCandidate: (cand: Candidate | null) => void;
  setShowCandidateModal: (show: boolean) => void;
  setEmailCandidate: (cand: Candidate | null) => void;
  setEmailSubject: (sub: string) => void;
  setEmailBody: (body: string) => void;
  setShowEmailModal: (show: boolean) => void;
  setWhatsAppCandidate: (cand: Candidate | null) => void;
  setWhatsAppMessage: (msg: string) => void;
  setShowWhatsAppModal: (show: boolean) => void;
  triggerToast: (msg: string) => void;
  logActivity: (type: string, desc: string) => void;
}

const PIPELINE_STAGES: JobCandidate['stage'][] = [
  'Applied', 'Screening', 'Shortlisted', 'Interview', 'Selected', 'Offer Sent', 'Joined'
];

export function JobCandidatesTab({
  job,
  jobCandidates,
  isLoading,
  onRefresh,
  allCandidates,
  setViewedCandidate,
  setShowCandidateModal,
  setEmailCandidate,
  setEmailSubject,
  setEmailBody,
  setShowEmailModal,
  setWhatsAppCandidate,
  setWhatsAppMessage,
  setShowWhatsAppModal,
  triggerToast,
  logActivity
}: JobCandidatesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [adding, setAdding] = useState(false);

  // Candidates not yet in this job's pipeline
  const alreadyAddedIds = new Set(jobCandidates.map(jc => jc.candidateId));
  const poolCandidates = allCandidates.filter(c =>
    c.status === 'Pool' && !alreadyAddedIds.has(c.id)
  );
  const filteredPool = poolCandidates.filter(c =>
    addSearch === '' ||
    c.name.toLowerCase().includes(addSearch.toLowerCase()) ||
    (c.skills || []).some(s => s.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleUpdateStage = async (jc: JobCandidate, stage: JobCandidate['stage']) => {
    try {
      const token = await getAuthToken();
      await fetch(`/api/job-candidates/${jc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ stage }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update stage', err);
    }
  };

  const handleRemoveFromPipeline = async (jc: JobCandidate) => {
    if (!confirm(`Remove ${jc.candidate?.name || 'this candidate'} from the pipeline for this job?`)) return;
    try {
      const token = await getAuthToken();
      await fetch(`/api/job-candidates/${jc.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      triggerToast(`Candidate removed from pipeline and returned to Talent Pool.`);
      logActivity('Pipeline', `Removed ${jc.candidate?.name} from ${job.title} pipeline.`);
      onRefresh();
    } catch (err) {
      console.error('Failed to remove from pipeline', err);
    }
  };

  const handleAddToJob = async (candidate: Candidate) => {
    setAdding(true);
    try {
      const token = await getAuthToken();
      await fetch('/api/job-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ jobId: job.id, candidateId: candidate.id, stage: 'Applied' }),
      });
      triggerToast(`✓ ${candidate.name} added to ${job.title} pipeline at Applied stage.`);
      logActivity('Pipeline', `Added ${candidate.name} to ${job.title} pipeline.`);
      setShowAddModal(false);
      setAddSearch('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add to pipeline', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Pipeline — Assigned Candidates</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{jobCandidates.length} candidates in this job's pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add from Talent Pool
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b">
                <th className="p-3">Candidate</th>
                <th className="p-3">Pipeline Stage</th>
                <th className="p-3">Experience</th>
                <th className="p-3">Added</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs animate-pulse">
              {[...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-slate-100 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-24 bg-slate-200 rounded" />
                        <div className="h-2.5 w-16 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><div className="h-5 w-20 bg-slate-100 rounded-full" /></td>
                  <td className="p-3"><div className="h-4 w-12 bg-slate-100 rounded" /></td>
                  <td className="p-3"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                  <td className="p-3 text-right"><div className="inline-block h-6 w-12 bg-slate-100 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : jobCandidates.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-semibold text-slate-500">No candidates assigned to this pipeline yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click <strong>Add from Talent Pool</strong> to assign candidates to this job.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b">
                <th className="p-3">Candidate</th>
                <th className="p-3">Pipeline Stage</th>
                <th className="p-3">Experience</th>
                <th className="p-3">Added</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {jobCandidates.map(jc => {
                const cand = jc.candidate;
                if (!cand) return null;
                return (
                  <tr key={jc.id} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setViewedCandidate(cand);
                          setShowCandidateModal(true);
                        }}
                        className="font-bold text-slate-950 font-sans hover:text-blue-600 transition-colors text-left flex items-center gap-1 cursor-pointer"
                      >
                        {cand.name}
                        <Eye className="h-3 w-3 text-slate-400 opacity-60 hover:opacity-100" />
                      </button>
                      <p className="text-[10px] text-slate-400 mt-0.5">{cand.email}</p>
                    </td>
                    <td className="p-3">
                      <Select
                        value={jc.stage}
                        onChange={(val) => handleUpdateStage(jc, val as JobCandidate['stage'])}
                        options={PIPELINE_STAGES.map(s => ({ value: s, label: s }))}
                      />
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-600">{cand.experience}</td>
                    <td className="p-3 text-slate-400 font-mono text-[10px]">{jc.addedDate}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEmailCandidate(cand);
                            setEmailSubject(`Application feedback - ${job.title}`);
                            setEmailBody(`Hi ${cand.name},\n\nWe appreciate your participation so far. We are writing to let you know...`);
                            setShowEmailModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setWhatsAppCandidate(cand);
                            setWhatsAppMessage(`Hi ${cand.name}! Let me know if you would like to connect to discuss feedback from the ${job.title} role.`);
                            setShowWhatsAppModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                          title="WhatsApp"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveFromPipeline(jc)}
                          className="p-1 text-slate-300 hover:text-rose-500 cursor-pointer"
                          title="Remove from pipeline"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add from Talent Pool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[70vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Add from Talent Pool</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{poolCandidates.length} candidates available in the pool</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddSearch(''); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search by name or skill..."
                  className="text-xs bg-transparent outline-none flex-1 text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5">
              {filteredPool.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs">No pool candidates found{addSearch ? ` matching "${addSearch}"` : ''}.</p>
                </div>
              ) : filteredPool.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.experience} · {(c.skills || []).slice(0, 3).join(', ')}</p>
                  </div>
                  <button
                    onClick={() => handleAddToJob(c)}
                    disabled={adding}
                    className="ml-3 shrink-0 px-3 py-1.5 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {adding ? '...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
