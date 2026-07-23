import React, { useState, useMemo } from 'react';
import { 
  X, Briefcase, Sparkles, Check, CheckCircle2, ChevronRight, Mail, AlertCircle, Eye, User, FileText 
} from 'lucide-react';
import { Company, Job, Candidate } from '../../types';
import { calculateMatchScore as getAIMatchScore } from '../../utils/matching';
import Portal from '../Portal';
import { useApp } from '../../context/AppContext';
import { Checkbox } from '../ui/Checkbox';

interface SubmitCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  jobs: Job[];
  candidates: Candidate[];
  onEditCandidate: (candidate: Candidate) => void;
  primaryContactEmail: string;
  onRecordSubmission: (selectedCandidates: Candidate[], selectedJob: Job, emailBody: string) => void;
}

export default function SubmitCandidateModal({
  isOpen,
  onClose,
  company,
  jobs,
  candidates,
  onEditCandidate,
  primaryContactEmail,
  onRecordSubmission
}: SubmitCandidateModalProps) {
  const { user } = useApp();
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Recruiter';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [previewingCandidate, setPreviewingCandidate] = useState<Candidate | null>(null);
  const [emailBody, setEmailBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  const companyJobs = useMemo(() => {
    return jobs.filter(j => j.companyId === company.id && j.status === 'Open');
  }, [jobs, company.id]);

  const selectedJob = useMemo(() => {
    return jobs.find(j => j.id === selectedJobId);
  }, [jobs, selectedJobId]);

  // AI-suggested candidates ranked by match score
  const suggestedCandidates = useMemo(() => {
    if (!selectedJob) return [];
    return candidates
      .map(candidate => ({
        ...candidate,
        computedScore: getAIMatchScore(candidate, selectedJob)
      }))
      .sort((a, b) => b.computedScore - a.computedScore);
  }, [candidates, selectedJob]);

  // Handle job selection and progress
  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedCandidateIds([]);
    setStep(2);
  };

  // Prepare dispatch email draft
  const handleProceedToEmail = () => {
    if (selectedCandidateIds.length === 0 || !selectedJob) return;
    
    const selectedCands = candidates.filter(c => selectedCandidateIds.includes(c.id));
    const subject = `[Candidate Submission] - ${selectedJob.title} - Hirly - Recruitment for ${company.name}`;
    
    const body = `Hi ${company.contactPerson || 'HR Team'},\n\nI hope you are doing well!\n\nI am delighted to submit the following qualified candidates for your open **${selectedJob.title}** role:\n\n` + 
      selectedCands.map(c => {
        const score = getAIMatchScore(c, selectedJob);
        return `• **${c.name}** - ${c.experience} Experience (AI Match Score: ${score}%)\n  Skills: ${(c.skills || []).join(', ')}\n  Key Highlight: ${c.notes ? c.notes.slice(0, 120) + '...' : 'Excellent alignment with job specs.'}`;
      }).join('\n\n') + 
      `\n\nPlease let me know your availability to review these profiles or schedule initial screening sessions.\n\nBest regards,\n${currentUserName}\nHirly Recruitment Partner`;

    setEmailSubject(subject);
    setEmailBody(body);
    setStep(3);
  };

  // Dispatch submission
  const handleSubmitSubmission = () => {
    if (!selectedJob) return;
    const selectedCands = candidates.filter(c => selectedCandidateIds.includes(c.id));
    
    // 1. Move candidates automatically to pipeline stage (e.g. 'Interview' or 'Screening')
    selectedCands.forEach(cand => {
      onEditCandidate({
        ...cand,
        status: 'Interview'
      });
    });

    // 2. Parent handles log entry creation
    onRecordSubmission(selectedCands, selectedJob, emailBody);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-55 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">Submit Candidates to {company.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono">AI-Assisted Staffing Workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workflow Progress Breadcrumb */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2.5 flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-blue-600' : 'text-slate-600'}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] border ${step === 1 ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-slate-100'}`}>1</span>
            Select Job
          </span>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-blue-600' : step > 2 ? 'text-slate-600' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] border ${step === 2 ? 'border-blue-600 bg-blue-50' : step > 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-300'}`}>2</span>
            AI Suggestions
          </span>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className={`flex items-center gap-1.5 ${step === 3 ? 'text-blue-600' : ''}`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] border ${step === 3 ? 'border-blue-600 bg-blue-50' : 'border-slate-300'}`}>3</span>
            HR Dispatch Email
          </span>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: SELECT JOB */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800">For which open vacancy would you like to submit candidates?</h4>
              {companyJobs.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                  <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">No open jobs found for {company.name}.</p>
                  <p className="text-[11px] text-slate-400">Add an open job opening to start submitting qualified candidates.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => handleSelectJob(job.id)}
                      className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 cursor-pointer hover:shadow-sm transition-all bg-white group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 text-xs">{job.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">{job.location} • {job.experience} Exp</p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {job.requiredSkills.slice(0, 3).map(skill => (
                              <span key={skill} className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-semibold text-slate-500 rounded font-mono">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {job.salary}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: AI MATCH SUGGESTIONS */}
          {step === 2 && selectedJob && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50/50 p-4 border border-blue-100 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-blue-900">AI Matching Sourcing Agent</p>
                  <p className="text-[10px] text-blue-700 mt-1">Candidates ranked by skills overlap & experience match for the <strong className="font-bold">{selectedJob.title}</strong> role.</p>
                </div>
                <button 
                  onClick={() => setStep(1)} 
                  className="px-2.5 py-1 text-[10px] font-mono border border-blue-200 text-blue-700 rounded bg-white hover:bg-blue-50"
                >
                  Change Job
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* List of Suggestions */}
                <div className="md:col-span-2 space-y-3">
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">RECOMMENDED TALENT</p>
                  
                  {suggestedCandidates.map(cand => {
                    const isSelected = selectedCandidateIds.includes(cand.id);
                    return (
                      <div 
                        key={cand.id}
                        className={`p-3.5 border rounded-xl flex items-center justify-between transition-all ${isSelected ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 bg-white hover:bg-slate-50/50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => {
                              setSelectedCandidateIds(prev => 
                                isSelected ? prev.filter(id => id !== cand.id) : [...prev, cand.id]
                              );
                            }}
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {cand.name}
                              <span className={`text-[9px] px-1.5 py-0.25 rounded-full font-bold ${
                                cand.computedScore > 85 ? 'bg-emerald-100 text-emerald-800' :
                                cand.computedScore > 70 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                AI {cand.computedScore}% Match
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.experience} Exp • {cand.currentCompany || 'Freelancer'}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(cand.skills || []).slice(0, 4).map(skill => {
                                const isMatched = (selectedJob.requiredSkills || []).some(rs => rs.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs.toLowerCase()));
                                return (
                                  <span 
                                    key={skill} 
                                    className={`px-1.5 py-0.25 text-[9px] font-semibold rounded font-mono ${
                                      isMatched ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {skill}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setPreviewingCandidate(cand)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            title="Preview Candidate Profile"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Candidate Preview Sidecard */}
                <div className="md:col-span-1 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  {previewingCandidate ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                          {previewingCandidate.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{previewingCandidate.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{previewingCandidate.email}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                        <div>
                          <p className="font-semibold text-slate-800 font-sans">Education</p>
                          <p className="text-slate-500 font-mono text-[10px] mt-0.5">{previewingCandidate.education || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 font-sans">Resume Snippet</p>
                          <p className="text-slate-500 mt-0.5 italic font-mono bg-white p-2 border border-slate-100 rounded text-[10px] max-h-32 overflow-y-auto">
                            {previewingCandidate.resumeText || 'No custom resume snippet loaded.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <User className="h-8 w-8 text-slate-300" />
                      <p className="text-[11px] font-semibold mt-2">No Profile Selected</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-40 leading-normal">Click the eye icon next to any candidate to view education, background, and skills alignment.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DISPATCH EMAIL PREVIEW */}
          {step === 3 && selectedJob && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex gap-2 text-xs">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Format Verified & Matching Complete</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Upon dispatching, candidate pipeline stages will auto-update and the submission is logged securely.</p>
                </div>
              </div>

              {/* Mock Outbox Frame */}
              <div className="border border-slate-800 bg-slate-950 text-white rounded-xl overflow-hidden shadow-xl">
                {/* Header info */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/40 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">To Company HR:</span>
                    <span className="text-blue-400 font-semibold font-mono">{primaryContactEmail || `${company.name.toLowerCase()}@hr.com`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Subject:</span>
                    <input 
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-transparent text-slate-100 font-bold border-b border-transparent hover:border-slate-800 focus:border-blue-500 focus:outline-none flex-1 font-sans font-medium"
                    />
                  </div>
                </div>

                {/* Email Body Area (White text on black background for perfect readability per constraints) */}
                <div className="p-4 bg-slate-950">
                  <textarea 
                    rows={11}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans resize-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-[10px] text-slate-400 font-mono">
            {step === 2 ? `${selectedCandidateIds.length} candidate(s) selected` : ''}
          </span>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            {step === 2 && (
              <button 
                onClick={handleProceedToEmail}
                disabled={selectedCandidateIds.length === 0}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                Proceed to Email
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={handleSubmitSubmission}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                Send & Record Submission
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </Portal>
  );
}
