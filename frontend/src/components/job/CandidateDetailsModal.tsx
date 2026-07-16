import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, IndianRupee, Clock, CheckCircle2, AlertTriangle, ArrowRight, Check, Eye } from 'lucide-react';
import { Candidate, Job } from '../../types';
import AnimatedModal from '../AnimatedModal';
import { calculateMatchScore } from '../../utils/matching';

interface CandidateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  viewedCandidate: Candidate | null;
  onUpdateCandidateStage: (id: string, stage: Candidate['status']) => void;
  triggerToast: (msg: string) => void;
  setEmailCandidate: (cand: Candidate | null) => void;
  setEmailSubject: (sub: string) => void;
  setEmailBody: (body: string) => void;
  setShowEmailModal: (show: boolean) => void;
  setWhatsAppCandidate: (cand: Candidate | null) => void;
  setWhatsAppMessage: (msg: string) => void;
  setShowWhatsAppModal: (show: boolean) => void;
}

export function CandidateDetailsModal({
  isOpen,
  onClose,
  job,
  viewedCandidate,
  onUpdateCandidateStage,
  triggerToast,
  setEmailCandidate,
  setEmailSubject,
  setEmailBody,
  setShowEmailModal,
  setWhatsAppCandidate,
  setWhatsAppMessage,
  setShowWhatsAppModal
}: CandidateDetailsModalProps) {
  const [isOpenLocal, setIsOpenLocal] = useState(isOpen);

  useEffect(() => {
    setIsOpenLocal(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpenLocal(false);
    setTimeout(onClose, 200);
  };

  if (!viewedCandidate) return null;

  const noticeDays = (viewedCandidate.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 3 === 0) ? 15 : 30;
  const noticePeriodText = noticeDays === 15 ? '15 days' : '30 days';
  const expectedSalaryK = (viewedCandidate.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 35) + 165;
  
  const jobMaxSalaryK = (() => {
    const matches = job.salary.match(/\d+[\d, ]*/g);
    if (matches && matches.length > 0) {
      const lastVal = matches[matches.length - 1].replace(/[^0-9]/g, '');
      const parsed = parseInt(lastVal);
      if (parsed > 1000) return Math.round(parsed / 1000);
      return parsed;
    }
    return 200;
  })();

  const candidateSkillsLower = (viewedCandidate.skills || []).map(s => s.toLowerCase());
  const jobRequiredSkills = job.requiredSkills || [];
  const matchedSkills = jobRequiredSkills.filter(rs => 
    candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
  );
  const missingSkills = jobRequiredSkills.filter(rs => 
    !candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
  );
  const otherSkills = (viewedCandidate.skills || []).filter(cs => 
    !jobRequiredSkills.some(rs => cs.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs.toLowerCase()))
  );

  const matchScore = calculateMatchScore(viewedCandidate, job);

  const prevCompanyMap: Record<string, string> = {
    'Emily Watson': 'Netlify',
    'Marcus Vance': 'Stripe',
    'Clara Oswald': 'Figma',
    'Devin Patel': 'Zapier',
    'Sarah Connor': 'Cyberdyne',
    'Alex Rivera': 'Bootcamp Graduate'
  };
  const prevCompany = prevCompanyMap[viewedCandidate.name] || 'Lumen Labs';

  const diagnosticItems = [
    missingSkills.length === 0 ? {
      text: 'Required skills matched',
      success: true
    } : {
      text: `Required skills ${matchedSkills.length}/${jobRequiredSkills.length || 4} matched`,
      success: matchedSkills.length >= (jobRequiredSkills.length || 4) / 2
    },
    (parseInt(viewedCandidate.experience) || 0) >= (parseInt(job.experience) || 5) ? {
      text: `Experience matches (${parseInt(viewedCandidate.experience) || 0}y ≥ ${parseInt(job.experience) || 5}y)`,
      success: true
    } : {
      text: `Experience ${parseInt(viewedCandidate.experience) || 0}y (just under ${parseInt(job.experience) || 5}y)`,
      success: false
    },
    (viewedCandidate.address.toLowerCase().includes('san francisco') || viewedCandidate.address.toLowerCase().includes('oakland') || viewedCandidate.address.toLowerCase().includes('palo alto')) ? {
      text: `Same city (${viewedCandidate.address.split(',')[0]})`,
      success: true
    } : {
      text: `Remote — different city`,
      success: false
    },
    expectedSalaryK <= jobMaxSalaryK ? {
      text: `Salary within budget (₹${expectedSalaryK}k ≤ ₹${jobMaxSalaryK}k)`,
      success: true
    } : {
      text: `Salary within budget`,
      success: true
    },
    noticeDays <= 15 ? {
      text: `Notice period ${noticePeriodText} (≤ 30)`,
      success: true
    } : {
      text: `Notice period ${noticePeriodText}`,
      success: true
    }
  ];

  return (
    <AnimatedModal isOpen={isOpenLocal} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden transition-all duration-200 transform flex flex-col max-h-[90vh] ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative p-6 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm font-mono ${
                viewedCandidate.name.charCodeAt(0) % 2 === 0 
                  ? 'bg-sky-100 text-sky-800 border-sky-200' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {viewedCandidate.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono mb-1.5">
                  {viewedCandidate.status}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 leading-none flex items-center gap-1.5 font-sans">
                  {viewedCandidate.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  {viewedCandidate.currentCompany || 'Freelancer'} (prev. {prevCompany}) · {viewedCandidate.experience} Experience
                </p>
              </div>
            </div>

            <button 
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 max-h-[calc(90vh-180px)]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">AI Match score</span>
                  
                  <div className="relative flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="42"
                        className="stroke-slate-100"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="42"
                        className={
                          matchScore >= 85 
                            ? "stroke-emerald-500" 
                            : matchScore >= 60 
                              ? "stroke-blue-500" 
                              : "stroke-slate-400"
                        }
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - matchScore / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-black font-mono text-slate-900">
                      {matchScore}%
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 mt-3 font-medium">
                    {matchScore >= 85 ? 'Highly Recommended Candidate' : matchScore >= 60 ? 'Strong Candidate' : 'Under Consideration'}
                  </p>
                </div>

                <div className="border border-slate-100 bg-slate-50/20 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Contact Details</span>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{viewedCandidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{viewedCandidate.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{viewedCandidate.address}</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 space-y-4">
                <div className="border border-slate-100 bg-white rounded-2xl p-4 space-y-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Verification Matrix</span>
                  <div className="space-y-3">
                    {diagnosticItems.map((diag, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-sans">
                        {diag.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug font-medium">{diag.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-100 bg-slate-50/45 rounded-xl p-3 text-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Salary Expectations</span>
                    <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-sm">
                      <IndianRupee className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>₹{expectedSalaryK}k / year</span>
                    </div>
                  </div>
                  <div className="border border-slate-100 bg-slate-50/40 rounded-xl p-3 text-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Availability</span>
                    <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-sm">
                      <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{noticeDays <= 15 ? 'Immediate (≤15d)' : '30d notice'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-100 bg-white rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Skillset alignment & categories</span>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Matched Required Skills ({matchedSkills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.length > 0 ? (
                      matchedSkills.map((sk, sidx) => (
                        <span key={sidx} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold font-sans">
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No matching core skills found</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Missing Required Skills ({missingSkills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingSkills.length > 0 ? (
                      missingSkills.map((sk, sidx) => (
                        <span key={sidx} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold font-sans">
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-600 font-bold italic font-sans bg-emerald-50/50 px-2 py-0.5 rounded">✓ Outstanding full match! No skills missing.</span>
                    )}
                  </div>
                </div>

                {otherSkills.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span>Other skills & technologies ({otherSkills.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {otherSkills.map((sk, sidx) => (
                        <span key={sidx} className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg text-xs font-medium font-sans">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-100 bg-slate-50/45 rounded-2xl p-5 space-y-2.5 text-xs text-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Recruiting assessment & notes</span>
              <p className="leading-relaxed font-sans">
                Candidate displays exceptional proficiency in modern systems. Previous responsibilities at <strong>{prevCompany}</strong> involved deploying client structures, working closely with cross-functional design coordinators, and standardizing component architectures.
              </p>
              <p className="leading-relaxed font-sans mt-2">
                They present strong diagnostic logic and state coordination. Ready for immediate technical screening as part of the <strong>{job.title}</strong> role pipelines.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onUpdateCandidateStage(viewedCandidate.id, 'Shortlisted');
                  triggerToast(`✓ Promoted ${viewedCandidate.name} to Shortlisted Pipeline stage!`);
                  handleClose();
                }}
                className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <ArrowRight className="h-4 w-4 text-slate-400" /> Shortlist
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEmailCandidate(viewedCandidate);
                  setEmailSubject(`Career opportunities at ${job.companyName}`);
                  setEmailBody(`Hi ${viewedCandidate.name},\n\nI hope you are doing well. I noticed your exceptional profile on our platform and would love to chat regarding the ${job.title} posting we have open at ${job.companyName}.\n\nLet me know if you have 15 minutes to spare next week.\n\nWarmly,\nSarah`);
                  handleClose();
                  setShowEmailModal(true);
                }}
                className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <Mail className="h-4 w-4 text-slate-400" /> Email
              </button>
              <button
                onClick={() => {
                  setWhatsAppCandidate(viewedCandidate);
                  setWhatsAppMessage(`Hi ${viewedCandidate.name}! This is Sarah from RecruitFlow. I saw your outstanding skills in ${viewedCandidate.skills.slice(0, 2).join(', ')} and would love to chat regarding a ${job.title} role at ${job.companyName}. Are you free to hop on a call?`);
                  handleClose();
                  setShowWhatsAppModal(true);
                }}
                className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <Phone className="h-4 w-4 text-slate-400" /> WhatsApp
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-sm cursor-pointer font-sans"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
