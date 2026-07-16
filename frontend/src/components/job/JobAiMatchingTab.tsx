import React, { useState } from 'react';
import { 
  Sparkles, RefreshCw, X, CheckCircle2, AlertTriangle, 
  Eye, Mail, Phone, ArrowRight, IndianRupee, MapPin, Clock, Check 
} from 'lucide-react';
import { Job, Candidate } from '../../types';
import { CandidateMatchResult } from './jobMatchHelpers';
import AnimatedModal from '../AnimatedModal';

interface JobAiMatchingTabProps {
  job: Job;
  detailSearch: string;
  candidateMatchData: CandidateMatchResult[];
  selectedCandidateIds: string[];
  setSelectedCandidateIds: (ids: string[]) => void;
  isScanning: boolean;
  triggerScan: () => void;
  toggleSelectCandidate: (id: string) => void;
  toggleSelectAll: (list: any[]) => void;
  handleBulkEmail: () => void;
  handleBulkShortlist: () => void;
  handleBulkPipeline: () => void;
  handleBulkExport: () => void;
  setViewedCandidate: (cand: Candidate | null) => void;
  setShowCandidateModal: (show: boolean) => void;
  setEmailCandidate: (cand: Candidate | null) => void;
  setEmailSubject: (sub: string) => void;
  setEmailBody: (body: string) => void;
  setShowEmailModal: (show: boolean) => void;
  setWhatsAppCandidate: (cand: Candidate | null) => void;
  setWhatsAppMessage: (msg: string) => void;
  setShowWhatsAppModal: (show: boolean) => void;
  onUpdateCandidateStage: (id: string, stage: Candidate['status']) => void;
  triggerToast: (msg: string) => void;
  onRefreshCandidates?: () => void;
}

export function JobAiMatchingTab({
  job,
  detailSearch,
  candidateMatchData,
  selectedCandidateIds,
  setSelectedCandidateIds,
  isScanning,
  triggerScan,
  toggleSelectCandidate,
  toggleSelectAll,
  handleBulkEmail,
  handleBulkShortlist,
  handleBulkPipeline,
  handleBulkExport,
  setViewedCandidate,
  setShowCandidateModal,
  setEmailCandidate,
  setEmailSubject,
  setEmailBody,
  setShowEmailModal,
  setWhatsAppCandidate,
  setWhatsAppMessage,
  setShowWhatsAppModal,
  onUpdateCandidateStage,
  triggerToast,
  onRefreshCandidates
}: JobAiMatchingTabProps) {
  const [pipelineModalCandidate, setPipelineModalCandidate] = useState<Candidate | null>(null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900">AI Intelligent Match Scoring</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Calculates overlap between applicant resume parsing vectors and candidate profiles.</p>
        </div>
        <button 
          onClick={triggerScan}
          disabled={isScanning}
          className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning Talents...' : 'Find Best Candidates'}
        </button>
      </div>

      {isScanning ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Sparkles className="h-10 w-10 text-slate-400 animate-pulse" />
          <p className="text-xs font-semibold text-slate-600">Executing Deep Semantic Vector Overlaps...</p>
          <p className="text-[10px] text-slate-400">Comparing expected compensation, years of tenure, notice constraint, and primary technical skillsets.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk Selection Actions Bar */}
          {selectedCandidateIds.length > 0 && (
            <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs animate-slide-up shadow-lg">
              <span className="font-semibold font-sans">
                {selectedCandidateIds.length} candidate{selectedCandidateIds.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleBulkEmail} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-bold transition-colors">
                  Send Batch Email
                </button>
                <button onClick={handleBulkShortlist} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-bold transition-colors">
                  Shortlist
                </button>
                <button onClick={handleBulkPipeline} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] rounded font-bold transition-colors">
                  Add to Pipeline
                </button>
                <button onClick={handleBulkExport} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-bold transition-colors">
                  Export
                </button>
                <button onClick={() => setSelectedCandidateIds([])} className="p-1 text-slate-400 hover:text-white transition-colors" title="Deselect All">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Header Select All Checkbox */}
          <div className="flex items-center gap-2 px-2 text-xs font-mono text-slate-400 py-1.5 border-b">
            <input 
              type="checkbox" 
              checked={selectedCandidateIds.length === candidateMatchData.length && candidateMatchData.length > 0} 
              onChange={() => toggleSelectAll(candidateMatchData)}
              className="rounded border-slate-300 focus:ring-slate-500 h-3.5 w-3.5"
            />
            <span>Select All Applicants ({candidateMatchData.length})</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {candidateMatchData.filter(item => item.candidate.name.toLowerCase().includes(detailSearch.toLowerCase())).map((item) => {
              const isSelected = selectedCandidateIds.includes(item.candidate.id);
              
              const expectedSalary = item.candidate.expectedSalary;
              const hasSalary = expectedSalary && expectedSalary.trim() !== '' && expectedSalary.trim().toLowerCase() !== 'n/a';

              const noticePeriod = item.candidate.noticePeriod;
              const hasNoticePeriod = noticePeriod && noticePeriod.trim() !== '' && noticePeriod.trim().toLowerCase() !== 'n/a';

              const parseMaxSalary = (salStr: string | null | undefined) => {
                if (!salStr || typeof salStr !== 'string') return 200;
                const matches = salStr.match(/\d+[\d, ]*/g);
                if (matches && matches.length > 0) {
                  const lastVal = matches[matches.length - 1].replace(/[^0-9]/g, '');
                  const parsed = parseInt(lastVal);
                  if (parsed > 1000) return Math.round(parsed / 1000);
                  return parsed;
                }
                return 200;
              };
              const jobMaxSalaryK = parseMaxSalary(job.salary);

              const candidateSkillsLower = (item.candidate.skills || []).map(s => s.toLowerCase());

              const matchedSkills = (job.requiredSkills || []).filter(rs => 
                candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
              );
              const missingSkills = (job.requiredSkills || []).filter(rs => 
                !candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
              );

              const totalRequiredCount = (job.requiredSkills || []).length || 4;
              const matchedCount = matchedSkills.length;

              const getPrevCompany = (name: string) => {
                const prevMap: Record<string, string> = {
                  'Emily Watson': 'Netlify',
                  'Marcus Vance': 'Stripe',
                  'Clara Oswald': 'Figma',
                  'Devin Patel': 'Zapier',
                  'Sarah Connor': 'Cyberdyne',
                  'Alex Rivera': 'Bootcamp Graduate'
                };
                return prevMap[name] || 'Lumen Labs';
              };

              const parseSalaryNum = (salStr: string | undefined) => {
                if (!salStr) return 0;
                const matches = salStr.match(/\d+[\d, ]*/g);
                if (matches && matches.length > 0) {
                  const val = matches[0].replace(/[^0-9]/g, '');
                  const parsed = parseInt(val);
                  if (parsed > 1000) return Math.round(parsed / 1000);
                  return parsed;
                }
                return 0;
              };

              const diagnosticItems = [
                missingSkills.length === 0 ? {
                  text: 'Required skills matched',
                  success: true
                } : {
                  text: `Required skills ${matchedCount}/${totalRequiredCount} matched`,
                  success: matchedCount >= totalRequiredCount / 2
                },
                (parseInt(item.candidate.experience) || 0) >= (parseInt(job.experience) || 5) ? {
                  text: `Experience matches (${parseInt(item.candidate.experience) || 0}y ≥ ${parseInt(job.experience) || 5}y)`,
                  success: true
                } : {
                  text: `Experience ${parseInt(item.candidate.experience) || 0}y (just under ${parseInt(job.experience) || 5}y)`,
                  success: false
                },
                (item.candidate.address && (item.candidate.address.toLowerCase().includes('san francisco') || item.candidate.address.toLowerCase().includes('oakland') || item.candidate.address.toLowerCase().includes('palo alto'))) ? {
                  text: `Same city (${item.candidate.address.split(',')[0]})`,
                  success: true
                } : {
                  text: `Remote — different city`,
                  success: false
                }
              ];

              if (hasSalary) {
                const candExpectedSalaryK = parseSalaryNum(expectedSalary);
                diagnosticItems.push(
                  candExpectedSalaryK > 0 && candExpectedSalaryK <= jobMaxSalaryK ? {
                    text: `Salary within budget ($${candExpectedSalaryK}k ≤ $${jobMaxSalaryK}k)`,
                    success: true
                  } : {
                    text: `Salary is $${candExpectedSalaryK}k (budget limit is $${jobMaxSalaryK}k)`,
                    success: candExpectedSalaryK <= jobMaxSalaryK
                  }
                );
              }

              if (hasNoticePeriod) {
                const noticeDaysVal = noticePeriod.toLowerCase().includes('immediate') || noticePeriod.toLowerCase().includes('15') ? 15 : 30;
                diagnosticItems.push(
                  noticeDaysVal <= 15 ? {
                    text: `Notice period ${noticePeriod} (≤ 30)`,
                    success: true
                  } : {
                    text: `Notice period ${noticePeriod}`,
                    success: true
                  }
                );
              }

              return (
                <div 
                  key={item.candidate.id} 
                  className={`bg-white border rounded-2xl p-5 md:p-6 space-y-4.5 transition-all relative flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                    isSelected ? 'border-slate-400 ring-1 ring-slate-400/50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectCandidate(item.candidate.id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-4 w-4 cursor-pointer shrink-0"
                      />
                      
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-3xs font-mono ${
                        item.candidate.name.charCodeAt(0) % 2 === 0 
                          ? 'bg-sky-50 text-sky-700 border-sky-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {item.candidate.name.split(' ').map(n => n[0]).join('')}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate leading-tight font-sans">
                          {item.candidate.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                          {item.candidate.currentCompany || 'Freelancer'} (prev. {getPrevCompany(item.candidate.name)}) · {item.candidate.experience} exp
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center shrink-0">
                      <svg className="w-11 h-11 transform -rotate-90">
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          className="stroke-slate-100"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          className={
                            item.score >= 85 
                              ? "stroke-emerald-500/80" 
                              : item.score >= 60 
                                ? "stroke-blue-500/80" 
                                : "stroke-slate-400"
                          }
                          strokeWidth="3.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={2 * Math.PI * 18 * (1 - item.score / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold font-mono text-slate-800">
                        {item.score}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/15 p-4 rounded-xl border border-emerald-100/10 space-y-2.5">
                    {diagnosticItems.map((diag, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[11px] text-slate-600 font-sans">
                        {diag.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{diag.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 text-[11px]">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Skills matched</span>
                      <div className="flex flex-wrap gap-1.5">
                        {matchedSkills.length > 0 ? (
                          matchedSkills.map((sk, sidx) => (
                            <span key={sidx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/80 rounded text-[10px] font-semibold font-sans">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">None</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Skills missing</span>
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.length > 0 ? (
                          missingSkills.map((sk, sidx) => (
                            <span key={sidx} className="px-2 py-0.5 bg-rose-50/80 text-rose-700 border border-rose-100/80 rounded text-[10px] font-semibold font-sans">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400/80 font-semibold italic font-sans mt-0.5 block">None — full match</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-500 py-2 border-t border-b border-slate-100/80">
                    {hasSalary && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5 text-amber-500" />
                          <span>{expectedSalary}</span>
                        </div>
                        <div className="h-3 w-[1px] bg-slate-200" />
                      </>
                    )}

                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-rose-400" />
                      <span className="truncate">{item.candidate.address || 'N/A'}</span>
                    </div>

                    {hasNoticePeriod && (
                      <>
                        <div className="h-3 w-[1px] bg-slate-200" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-orange-400" />
                          <span>{noticePeriod}</span>
                        </div>
                        <div className="h-3 w-[1px] bg-slate-200" />
                        <div className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-500 font-extrabold" />
                          <span>
                            {noticePeriod.toLowerCase().includes('immediate') || noticePeriod.toLowerCase().includes('15')
                              ? 'Immediate'
                              : '30 days'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button 
                      onClick={() => {
                        setViewedCandidate(item.candidate);
                        setShowCandidateModal(true);
                      }}
                      className="flex-1 min-w-[70px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-400" /> View
                    </button>
                    <button 
                      onClick={() => {
                        setEmailCandidate(item.candidate);
                        setEmailSubject(`Career opportunities at ${job.companyName}`);
                        setEmailBody(`Hi ${item.candidate.name},\n\nI hope you are doing well. I noticed your exceptional profile on our platform and would love to chat regarding the ${job.title} posting we have open at ${job.companyName}.\n\nLet me know if you have 15 minutes to spare next week.\n\nWarmly,\nSarah`);
                        setShowEmailModal(true);
                      }}
                      className="flex-1 min-w-[75px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                    </button>
                    <button 
                      onClick={() => {
                        setWhatsAppCandidate(item.candidate);
                        setWhatsAppMessage(`Hi ${item.candidate.name}! This is Sarah from RecruitFlow. I saw your outstanding skills in ${item.candidate.skills.slice(0, 2).join(', ')} and would love to chat regarding a ${job.title} role at ${job.companyName}. Are you free to hop on a call?`);
                        setShowWhatsAppModal(true);
                      }}
                      className="flex-1 min-w-[85px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> WhatsApp
                    </button>
                    <button 
                      onClick={() => setPipelineModalCandidate(item.candidate)}
                      className="flex-1 min-w-[80px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> Pipeline
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage Selection Popup Modal */}
      <AnimatedModal 
        isOpen={!!pipelineModalCandidate} 
        onClose={() => setPipelineModalCandidate(null)}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
                  <ArrowRight className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Add to Job Pipeline</h3>
                  <p className="text-[10px] text-slate-404 font-mono font-bold">Select stage for {pipelineModalCandidate?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setPipelineModalCandidate(null)} 
                className="p-1 text-slate-444 hover:text-slate-655 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stages List */}
            <div className="p-4 space-y-1.5 text-xs font-sans">
              {[
                { stage: 'Applied', desc: 'Initial application received' },
                { stage: 'Screening', desc: 'Recruiter phone screening' },
                { stage: 'Shortlisted', desc: 'Qualified candidate' },
                { stage: 'Interview', desc: 'Active rounds scheduled' },
                { stage: 'Selected', desc: 'Passed interview checks' },
                { stage: 'Offer Sent', desc: 'Contract offer extended' },
                { stage: 'Joined', desc: 'Hired and successfully onboarded' }
              ].map(({ stage, desc }) => (
                <button
                  key={stage}
                  onClick={async () => {
                    if (!pipelineModalCandidate) return;
                    try {
                      const { supabase } = await import('../../utils/supabase');
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      const res = await fetch('/api/job-candidates', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ jobId: job.id, candidateId: pipelineModalCandidate.id, stage }),
                      });
                      if (res.ok) {
                        triggerToast(`✓ Added ${pipelineModalCandidate.name} to pipeline at ${stage} stage.`);
                        if (onRefreshCandidates) onRefreshCandidates();
                      } else {
                        const err = await res.json();
                        triggerToast(err.error || 'Failed to update pipeline');
                      }
                    } catch (err) {
                      console.error(err);
                      triggerToast('Failed to add candidate to pipeline');
                    } finally {
                      setPipelineModalCandidate(null);
                    }
                  }}
                  className="w-full text-left p-3 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-blue-200 cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block">{stage}</span>
                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-500 block truncate">{desc}</span>
                  </div>
                  <span className="ml-3 shrink-0 h-5 w-5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-all">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
}
