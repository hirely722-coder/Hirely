import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, Sparkles, Copy, Maximize2, CheckCircle2, ChevronDown, ChevronUp, BookOpen, Check } from 'lucide-react';
import { Candidate, Job } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface JobOutreachModalsProps {
  job: Job;
  showEmailModal: boolean;
  setShowEmailModal: (show: boolean) => void;
  emailCandidate: Candidate | null;
  setEmailCandidate: (cand: Candidate | null) => void;
  emailSubject: string;
  setEmailSubject: (sub: string) => void;
  emailBody: string;
  setEmailBody: (body: string) => void;
  selectedJobTemplateId: string;
  setSelectedJobTemplateId: (id: string) => void;
  handleSendEmailSubmit: (e: React.FormEvent) => void;

  showWhatsAppModal: boolean;
  setShowWhatsAppModal: (show: boolean) => void;
  whatsAppCandidate: Candidate | null;
  setWhatsAppCandidate: (cand: Candidate | null) => void;
  whatsAppMessage: string;
  setWhatsAppMessage: (msg: string) => void;
  handleSendWhatsAppSubmit: (e: React.FormEvent) => void;

  showAiReportModal: boolean;
  setShowAiReportModal: (show: boolean) => void;
  aiFeatureResult: {
    title: string;
    text?: string;
    structured?: boolean;
    data?: {
      intro: string;
      questions: Array<{
        question: string;
        category: string;
        targetSkill: string;
        idealAnswer: string;
      }>;
    };
  } | null;
  triggerToast: (msg: string) => void;
}

export function JobOutreachModals({
  job,
  showEmailModal,
  setShowEmailModal,
  emailCandidate,
  setEmailCandidate,
  emailSubject,
  setEmailSubject,
  emailBody,
  setEmailBody,
  selectedJobTemplateId,
  setSelectedJobTemplateId,
  handleSendEmailSubmit,

  showWhatsAppModal,
  setShowWhatsAppModal,
  whatsAppCandidate,
  setWhatsAppCandidate,
  whatsAppMessage,
  setWhatsAppMessage,
  handleSendWhatsAppSubmit,

  showAiReportModal,
  setShowAiReportModal,
  aiFeatureResult,
  triggerToast
}: JobOutreachModalsProps) {
  const [emailOpen, setEmailOpen] = useState(showEmailModal);
  const [waOpen, setWaOpen] = useState(showWhatsAppModal);
  const [aiReportOpen, setAiReportOpen] = useState(showAiReportModal);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);

  useEffect(() => {
    setEmailOpen(showEmailModal);
  }, [showEmailModal]);

  useEffect(() => {
    setWaOpen(showWhatsAppModal);
  }, [showWhatsAppModal]);

  useEffect(() => {
    setAiReportOpen(showAiReportModal);
  }, [showAiReportModal]);

  const handleCloseEmail = () => {
    setEmailOpen(false);
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailCandidate(null);
    }, 200);
  };

  const handleCloseWhatsApp = () => {
    setWaOpen(false);
    setTimeout(() => {
      setShowWhatsAppModal(false);
      setWhatsAppCandidate(null);
    }, 200);
  };

  const handleCloseAiReport = () => {
    setAiReportOpen(false);
    setTimeout(() => {
      setShowAiReportModal(false);
    }, 200);
  };

  return (
    <>
      {/* EMAIL OUTREACH COMPOSE MODAL */}
      <AnimatedModal isOpen={emailOpen && !!emailCandidate} onClose={handleCloseEmail}>
        {(animate) => {
          if (!emailCandidate) return null;
          return (
            <div 
              className={`bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden transition-all duration-200 transform ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                  <Mail className="h-4.5 w-4.5 text-slate-500" />
                  Compose Outreach: {emailCandidate.name}
                </h3>
                <button onClick={handleCloseEmail} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSendEmailSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Select Outreach Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'custom',
                        name: '✏️ Custom (Blank)',
                        subject: `Regarding your application for ${job.title}`,
                        body: `Dear ${emailCandidate.name},\n\nI hope you are doing well.\n\nBest regards,\nSarah Jenkins`
                      },
                      {
                        id: 'screening_invite',
                        name: '⏱️ Screen Interview',
                        subject: `Interview Schedule request - ${job.title} at ${job.companyName}`,
                        body: `Dear ${emailCandidate.name},\n\nWe would love to invite you for a brief 15-minute introductory video call regarding the ${job.title} position at ${job.companyName}.\n\nPlease let us know your availability.\n\nBest,\nSarah Jenkins`
                      },
                      {
                        id: 'offer_announce',
                        name: '💼 Offer Announcement',
                        subject: `Offer Letter terms - ${job.title} at ${job.companyName}`,
                        body: `Dear ${emailCandidate.name},\n\nCongratulations! We are thrilled to extend an official offer of employment for the ${job.title} role at ${job.companyName}.\n\nWe look forward to having you on the team.\n\nBest,\nSarah Jenkins`
                      },
                      {
                        id: 'next_steps',
                        name: '📅 Application Status',
                        subject: `Next Steps regarding ${job.title}`,
                        body: `Dear ${emailCandidate.name},\n\nWe wanted to reach out regarding your application for the ${job.title} role at ${job.companyName}. We are currently reviewing next stages and will keep you posted shortly.\n\nBest regards,\nSarah Jenkins`
                      }
                    ].map(tmpl => {
                      const isSelected = selectedJobTemplateId === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            setSelectedJobTemplateId(tmpl.id);
                            setEmailSubject(tmpl.subject);
                            setEmailBody(tmpl.body);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold truncate">{tmpl.name}</div>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">Quick select style</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Recipient Email</label>
                  <input 
                    type="text" 
                    disabled 
                    value={emailCandidate.email}
                    className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded bg-slate-100 text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Subject Title</label>
                  <input 
                    type="text" 
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Message Body</label>
                  <textarea 
                    required
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded font-sans leading-relaxed bg-slate-50/50 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button 
                    type="button" 
                    onClick={handleCloseEmail}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded shadow-xs cursor-pointer"
                  >
                    Transmit Email
                  </button>
                </div>
              </form>
            </div>
          );
        }}
      </AnimatedModal>

      {/* WHATSAPP OUTREACH COMPOSE MODAL */}
      <AnimatedModal isOpen={waOpen && !!whatsAppCandidate} onClose={handleCloseWhatsApp}>
        {(animate) => {
          if (!whatsAppCandidate) return null;
          return (
            <div 
              className={`bg-white rounded-xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden transition-all duration-200 transform ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                  <Phone className="h-4.5 w-4.5 text-slate-500" />
                  Compose WhatsApp Chat Message: {whatsAppCandidate.name}
                </h3>
                <button onClick={handleCloseWhatsApp} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSendWhatsAppSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    disabled 
                    value={whatsAppCandidate.phone}
                    className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded bg-slate-100 text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">WhatsApp Message</label>
                  <textarea 
                    required
                    rows={4}
                    value={whatsAppMessage}
                    onChange={(e) => setWhatsAppMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded font-sans leading-relaxed bg-slate-50/50 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button 
                    type="button" 
                    onClick={handleCloseWhatsApp}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 rounded shadow-xs cursor-pointer"
                  >
                    Send WhatsApp Message
                  </button>
                </div>
              </form>
            </div>
          );
        }}
      </AnimatedModal>

      {/* FULL-SCREEN AI INSIGHTS REPORT */}
      <AnimatedModal isOpen={aiReportOpen && !!aiFeatureResult} onClose={handleCloseAiReport}>
        {(animate) => {
          if (!aiFeatureResult) return null;
          return (
            <div 
              className={`bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden transition-all duration-200 transform ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                    <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                      {aiFeatureResult.title}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      Hirly AI Co-Pilot • Real-time Report Analysis
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseAiReport} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-white">
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 flex gap-2.5 text-indigo-900 items-start">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-indigo-950">Context Calibration Enabled</p>
                    <p className="text-[10.5px] text-indigo-800 leading-relaxed mt-0.5 font-medium">
                      This automated report has processed skill parameters for the <span className="font-bold text-indigo-950">{job.title}</span> role at <span className="font-bold text-indigo-950">{job.companyName}</span> against candidate files.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 text-slate-800 select-text font-sans">
                  {aiFeatureResult.structured && aiFeatureResult.data ? (
                    <div className="space-y-4 pr-1">
                      {/* Intro panel */}
                      {aiFeatureResult.data.intro && (
                        <div className="p-3.5 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-xl border border-indigo-100/50 text-slate-600 leading-relaxed italic text-xs font-sans">
                          {aiFeatureResult.data.intro}
                        </div>
                      )}

                      {/* Questions Accordion List */}
                      <div className="space-y-3">
                        {aiFeatureResult.data.questions.map((q, idx) => {
                          const isExpanded = expandedQuestionIdx === idx;
                          const isCopied = copiedQuestionIdx === idx;

                          return (
                            <div 
                              key={idx}
                              className={`border rounded-xl transition-all overflow-hidden ${
                                isExpanded 
                                  ? 'border-indigo-200 bg-indigo-50/10 shadow-xs' 
                                  : 'border-slate-150 bg-white hover:bg-slate-50/40 hover:border-slate-300'
                              }`}
                            >
                              {/* Accordion Trigger Header */}
                              <div 
                                onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                                className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
                              >
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="h-5.5 w-5.5 shrink-0 rounded-full bg-indigo-150 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs">
                                      {idx + 1}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide bg-blue-100 text-blue-750">
                                      {q.category}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide bg-slate-100 text-slate-600 border border-slate-200/50">
                                      Tested Skill: {q.targetSkill}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-900 leading-snug font-sans pr-4">
                                    {q.question}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(q.question);
                                      setCopiedQuestionIdx(idx);
                                      triggerToast(`✓ Copied Question ${idx + 1} to clipboard!`);
                                      setTimeout(() => setCopiedQuestionIdx(null), 2000);
                                    }}
                                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="Copy question text"
                                  >
                                    {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <ChevronDown 
                                      className="h-4 w-4 transition-transform duration-200" 
                                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} 
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Accordion Collapsible Panel */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-white/70">
                                  <div className="mt-3.5 p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100/60 space-y-1.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase font-mono tracking-wider">
                                      <BookOpen className="h-3 w-3" />
                                      Reviewer Guide & Evaluation Criteria
                                    </div>
                                    <p className="text-slate-650 leading-relaxed font-sans text-xs select-text">
                                      {q.idealAnswer}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    aiFeatureResult.text && aiFeatureResult.text.split('\n').map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={idx} className="h-2" />;

                      const numberMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
                      if (numberMatch) {
                        const num = numberMatch[1];
                        const rest = numberMatch[2];
                        return (
                          <div key={idx} className="flex gap-3 items-start bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                            <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs shadow-inner">
                              {num}
                            </span>
                            <div className="space-y-1 flex-1">
                              <p className="text-xs font-extrabold text-slate-900">Recommendation {num}</p>
                              <p className="text-xs text-slate-700 leading-relaxed font-sans">{rest}</p>
                            </div>
                          </div>
                        );
                      }

                      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                        const content = trimmed.substring(1).trim();
                        return (
                          <div key={idx} className="flex gap-2.5 items-start pl-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-700 leading-relaxed font-sans">{content}</p>
                          </div>
                        );
                      }

                      if (trimmed.endsWith(':')) {
                        return (
                          <h4 key={idx} className="text-[11px] font-bold text-indigo-950 uppercase font-sans tracking-wider mt-4 border-l-2 border-indigo-600 pl-2.5">
                            {trimmed}
                          </h4>
                        );
                      }

                      return (
                        <p key={idx} className="text-xs text-slate-700 leading-relaxed font-sans">
                          {trimmed}
                        </p>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
                <span className="text-[10px] text-slate-400 font-sans font-medium">Auto-generated via Hirly Intelligent Core.</span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (aiFeatureResult.structured && aiFeatureResult.data) {
                        const qText = aiFeatureResult.data.questions.map((q, i) => 
                          `Q${i+1}: ${q.question}\nCategory: ${q.category} | Skill: ${q.targetSkill}\nIdeal Answer: ${q.idealAnswer}`
                        ).join('\n\n');
                        navigator.clipboard.writeText(qText);
                      } else {
                        navigator.clipboard.writeText(aiFeatureResult.text || '');
                      }
                      triggerToast('✓ Copied AI response to clipboard!');
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    Copy Text
                  </button>
                  <button 
                    type="button"
                    onClick={handleCloseAiReport}
                    className="px-4.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      </AnimatedModal>
    </>
  );
}
