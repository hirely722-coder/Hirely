import React from 'react';
import { Sparkles, Eye, Mail, MessageSquare, Trash } from 'lucide-react';
import { Company, Candidate } from '../../types';

interface CompanyCandidatesTabProps {
  company: Company;
  candidates: Candidate[];
  filteredCandidates: Candidate[];
  selectedCandidateIds: string[];
  setSelectedCandidateIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShowSubmitModal: React.Dispatch<React.SetStateAction<boolean>>;
  onEditCandidate: (candidate: Candidate) => void;
  addActivity: (desc: string) => void;
  showLocalToast: (text: string, type: 'success' | 'error') => void;
  triggerEmailCompany: (email: string, name: string) => void;
  triggerWhatsAppCompany: (phone: string, name: string) => void;
}

export function CompanyCandidatesTab({
  company,
  candidates,
  filteredCandidates,
  selectedCandidateIds,
  setSelectedCandidateIds,
  setShowSubmitModal,
  onEditCandidate,
  addActivity,
  showLocalToast,
  triggerEmailCompany,
  triggerWhatsAppCompany
}: CompanyCandidatesTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-900 font-sans">Submitted Candidate Profiles ({filteredCandidates.length})</h3>
          {selectedCandidateIds.length > 0 && (
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-sans animate-scale-up">
              {selectedCandidateIds.length} Selected
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Submit Candidate
          </button>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedCandidateIds.length > 0 && (
        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs animate-slide-up">
          <span className="font-semibold text-blue-900 font-sans">Apply bulk actions on selected candidates:</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                showLocalToast(`✓ Mock email templates sent to ${selectedCandidateIds.length} candidate(s)!`, 'success');
                setSelectedCandidateIds([]);
              }}
              className="px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 rounded-lg text-[10px] font-semibold cursor-pointer shadow-2xs"
            >
              Send Bulk Email
            </button>
            <button 
              onClick={() => {
                showLocalToast(`✓ Bulk WhatsApp alerts dispatched to ${selectedCandidateIds.length} candidate(s)!`, 'success');
                setSelectedCandidateIds([]);
              }}
              className="px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 rounded-lg text-[10px] font-semibold cursor-pointer shadow-2xs"
            >
              Send Bulk WhatsApp
            </button>
            <button 
              onClick={() => {
                selectedCandidateIds.forEach(id => {
                  const cand = candidates.find(c => c.id === id);
                  if (cand) onEditCandidate({ ...cand, status: 'Selected' });
                });
                showLocalToast(`✓ Moved ${selectedCandidateIds.length} candidates to Selection stage!`, 'success');
                setSelectedCandidateIds([]);
              }}
              className="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-[10px] font-bold cursor-pointer shadow-2xs"
            >
              Move Stage to Selected
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase">
              <th className="p-4 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                  onChange={(e) => {
                    setSelectedCandidateIds(e.target.checked ? filteredCandidates.map(c => c.id) : []);
                  }}
                  className="h-4 w-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
              </th>
              <th className="p-4 font-bold">Candidate</th>
              <th className="p-4 font-bold">Pipeline Stage</th>
              <th className="p-4 font-bold text-center">AI Match Score</th>
              <th className="p-4 font-bold">Assigned Recruiter</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  No candidates currently submitted for client evaluation. Use "Submit Candidate" above to add profiles.
                </td>
              </tr>
            ) : (
              filteredCandidates.map(cand => {
                const isChecked = selectedCandidateIds.includes(cand.id);
                return (
                  <tr key={cand.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-blue-50/20' : ''}`}>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedCandidateIds(prev => 
                            isChecked ? prev.filter(id => id !== cand.id) : [...prev, cand.id]
                          );
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-xs">
                          {cand.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 font-sans">{cand.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.email} • {cand.experience}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={cand.status}
                        onChange={(e) => {
                          onEditCandidate({ ...cand, status: e.target.value as any });
                          addActivity(`Moved ${cand.name} pipeline stage to ${e.target.value}`);
                          showLocalToast(`✓ Stage updated for ${cand.name}!`, 'success');
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer shadow-2xs"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Screening">Screening</option>
                        <option value="Interview">Interview</option>
                        <option value="Selected">Selected</option>
                        <option value="Joined">Joined</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        cand.aiMatchScore > 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        cand.aiMatchScore > 70 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cand.aiMatchScore}%
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-semibold font-sans">{company.recContact || 'Sarah Jenkins'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => showLocalToast(`Profile summary of ${cand.name}: ${cand.resumeText || 'No custom details loaded.'}`, 'success')}
                          className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                          title="View Profile Snapshot"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => triggerEmailCompany(cand.email, cand.name)}
                          className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                          title="Email Candidate"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => triggerWhatsAppCompany(cand.phone, cand.name)}
                          className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                          title="WhatsApp Candidate"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            onEditCandidate({ ...cand, status: 'Applied' });
                            showLocalToast(`Removed submission for ${cand.name}`, 'error');
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove Candidate Submission"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
