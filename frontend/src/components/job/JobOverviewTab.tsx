import React, { useState } from 'react';
import { 
  Sparkles, Award, HelpCircle, FileText, AlertTriangle, 
  TrendingUp, DollarSign, Sliders, Mail, Phone, Copy, Maximize2, CheckCircle2, ChevronDown, ChevronUp, BookOpen, Check
} from 'lucide-react';
import { Job } from '../../types';

function renderFormattedLine(line: string): React.ReactNode[] {
  // First, parse bolding **
  let parts: (string | React.ReactNode)[] = [line];
  
  if (line.includes('**')) {
    const boldParts = line.split('**');
    parts = boldParts.map((part, pIdx) => {
      if (pIdx % 2 === 1) {
        return React.createElement('strong', { key: `b-${pIdx}`, className: 'font-extrabold text-slate-900' }, part);
      }
      return part;
    });
  }

  // Next, parse italics *
  const finalParts: React.ReactNode[] = [];
  parts.forEach((part, pIdx) => {
    if (typeof part === 'string' && part.includes('*')) {
      const italicParts = part.split('*');
      italicParts.forEach((subPart, sIdx) => {
        if (sIdx % 2 === 1) {
          finalParts.push(React.createElement('em', { key: `i-${pIdx}-${sIdx}`, className: 'italic text-slate-500 font-medium' }, subPart));
        } else if (subPart) {
          finalParts.push(subPart);
        }
      });
    } else if (part) {
      finalParts.push(part);
    }
  });

  return finalParts;
}

interface JobOverviewTabProps {
  job: Job;
  executeAiTool: (toolKey: string) => void;
  isAiProcessing: boolean;
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
  setShowAiReportModal: (show: boolean) => void;
  triggerToast: (msg: string) => void;
}

export function JobOverviewTab({
  job,
  executeAiTool,
  isAiProcessing,
  aiFeatureResult,
  setShowAiReportModal,
  triggerToast
}: JobOverviewTabProps) {
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Salary Range</span>
          <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.salary}</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Required Experience</span>
          <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.experience}</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Location Format</span>
          <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.location}</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Employment Type</span>
          <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.employmentType || 'Full-time'}</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Department</span>
          <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.department || 'Engineering'}</strong>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Urgency Level</span>
          <strong className={`text-xs font-sans block mt-0.5 ${
            job.urgency === 'Urgent' ? 'text-rose-600 font-bold' :
            job.urgency === 'High' ? 'text-amber-600 font-bold' :
            'text-slate-800'
          }`}>{job.urgency || 'Medium'}</strong>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Role Description</h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50/50 p-4 rounded-lg border">
            {job.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(job.requiredSkills || []).map((skill, idx) => (
                <span key={idx} className="text-[10px] px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Preferred Supplementary Skills</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['GraphQL', 'Docker', 'Next.js App Router', 'TypeScript Advanced Generic-Type Design'].map((skill, idx) => (
                <span key={idx} className="text-[10px] px-2.5 py-1 bg-blue-50/60 border border-blue-100 text-blue-800 rounded-md font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Recruitment Ownership</h3>
          <div className="flex items-center gap-3 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 max-w-sm">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-mono flex items-center justify-center text-xs font-bold">
              {(job.recruiterName || 'Sarah Jenkins').split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{job.recruiterName || 'Sarah Jenkins'}</h4>
              <p className="text-[10px] text-slate-400">Lead Recruiting Partner</p>
            </div>
          </div>
        </div>

        {/* AI Insights & Assistant Playground */}
        <div className="relative overflow-hidden bg-white border-2 border-indigo-500/35 rounded-2xl p-6 shadow-xl shadow-indigo-100/50 space-y-5 transition-all duration-300 hover:shadow-indigo-200/50 hover:border-indigo-500/60 mt-6">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 animate-pulse" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-inner animate-pulse">
                <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  Practical AI Co-Pilot
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-indigo-100 text-indigo-800 animate-bounce">
                    AI ACTIVE
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Run one-click strategic operations below</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <button 
              type="button"
              onClick={() => executeAiTool('shortlist')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <Award className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Match Shortlist</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Select high-match list</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('questions')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Interview Q&As</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Tailored template questions</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('summarize')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Summarize Job</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Core requirements bullets</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('missing_skills')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Missing Skills</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Highlight key talent gaps</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('difficulty')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Hiring Market</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Predict search difficulty</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('salary_recomm')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Salary Advice</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Local market benchmark</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('alt_skills')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer sm:col-span-2 md:col-span-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                  <Sliders className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[11px] text-slate-800 leading-tight">Suggest Alternative Skills</div>
                  <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Find equivalent keywords & framework variations</div>
                </div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('candidate_email')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">Outreach Email</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Draft cold email sequence</div>
            </button>

            <button 
              type="button"
              onClick={() => executeAiTool('whatsapp_msg')}
              className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer sm:col-span-2 md:col-span-2"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                <Phone className="h-4 w-4" />
              </div>
              <div className="font-bold text-[11px] text-slate-800 leading-tight">WhatsApp Ping</div>
              <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Draft mobile outreach SMS</div>
            </button>
          </div>

          {/* AI Generator Output Box */}
          {(isAiProcessing || aiFeatureResult) && (
            <div className="mt-5 p-4 border-2 border-indigo-200 bg-indigo-50/30 rounded-2xl space-y-3.5 animate-fade-in">
              {isAiProcessing ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3 text-slate-500">
                  <Sparkles className="h-6 w-6 text-indigo-600 animate-spin" />
                  <span className="text-[11px] font-mono tracking-tight animate-pulse">Running advanced matching heuristics...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <h4 className="text-[10.5px] font-bold text-indigo-950 font-sans tracking-tight uppercase">
                        {aiFeatureResult?.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => {
                          if (aiFeatureResult?.structured && aiFeatureResult?.data) {
                            const qText = aiFeatureResult.data.questions.map((q, i) => 
                              `Q${i+1}: ${q.question}\nCategory: ${q.category} | Skill: ${q.targetSkill}\nIdeal Answer: ${q.idealAnswer}`
                            ).join('\n\n');
                            navigator.clipboard.writeText(qText);
                          } else {
                            navigator.clipboard.writeText(aiFeatureResult?.text || '');
                          }
                          triggerToast('✓ Copied AI response to clipboard!');
                        }} 
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-bold text-indigo-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowAiReportModal(true);
                        }} 
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
                      >
                        <Maximize2 className="h-3 w-3" /> Maximize
                      </button>
                    </div>
                  </div>

                  {aiFeatureResult?.structured && aiFeatureResult?.data ? (
                    <div className="space-y-4 max-h-[36rem] overflow-y-auto pr-1">
                      {/* Intro panel */}
                      {aiFeatureResult.data.intro && (
                        <div className="p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-xl border border-indigo-100/50 text-slate-600 leading-relaxed italic text-[11px] font-sans">
                          {aiFeatureResult.data.intro}
                        </div>
                      )}

                      {/* Questions Accordion List */}
                      <div className="space-y-2.5">
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
                                    <span className="h-5 w-5 shrink-0 rounded-full bg-indigo-150 text-indigo-700 flex items-center justify-center font-mono font-bold text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide bg-blue-100 text-blue-750">
                                      {q.category}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide bg-slate-100 text-slate-600 border border-slate-200/50">
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
                                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <ChevronDown 
                                      className="h-3.5 w-3.5 transition-transform duration-200" 
                                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }} 
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Accordion Collapsible Panel */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-white/70">
                                  <div className="mt-3.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100/60 space-y-1.5">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase font-mono tracking-wider">
                                      <BookOpen className="h-3 w-3" />
                                      Reviewer Guide & Evaluation Criteria
                                    </div>
                                    <p className="text-slate-600 leading-relaxed font-sans text-xs select-text">
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
                    <div className="bg-white border border-indigo-100/80 rounded-xl p-4 shadow-inner max-h-72 overflow-y-auto space-y-3 select-text">
                      {aiFeatureResult?.text && aiFeatureResult.text.split('\n').map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={idx} className="h-2" />;

                        const numberMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
                        if (numberMatch) {
                          const num = numberMatch[1];
                          const rest = numberMatch[2];
                          return (
                            <div key={idx} className="flex gap-2.5 items-start bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/60">
                              <span className="h-5 w-5 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-[10px]">
                                {num}
                              </span>
                              <p className="text-[11.5px] text-slate-700 leading-relaxed font-sans">{renderFormattedLine(rest)}</p>
                            </div>
                          );
                        }

                        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                          const content = trimmed.substring(1).trim();
                          return (
                            <div key={idx} className="flex gap-2 items-start pl-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <p className="text-[11.5px] text-slate-700 leading-relaxed font-sans">{renderFormattedLine(content)}</p>
                            </div>
                          );
                        }

                        if (trimmed.endsWith(':')) {
                          return (
                            <h5 key={idx} className="text-[10.5px] font-extrabold text-indigo-950 uppercase tracking-wide mt-3 border-l-2 border-indigo-500 pl-2">
                              {renderFormattedLine(trimmed)}
                            </h5>
                          );
                        }

                        return (
                          <p key={idx} className="text-[11.5px] text-slate-600 leading-relaxed font-sans">
                            {renderFormattedLine(trimmed)}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
