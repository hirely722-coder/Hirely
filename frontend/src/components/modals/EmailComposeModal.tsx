import React, { useState, useEffect } from 'react';
import { X, Mail, Send, AlertCircle, HelpCircle, Sparkles, Plus } from 'lucide-react';
import { Candidate, Job, EmailTemplate, EmailConfig, CommunicationLog } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface EmailComposeModalProps {
  candidate: Candidate;
  candidates?: Candidate[];
  jobs: Job[];
  templates: EmailTemplate[];
  emailConfig: EmailConfig;
  onClose: () => void;
  onSend: (log: CommunicationLog, autoCreateTask: boolean) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
  preselectedJobId?: string;
}

export function EmailComposeModal({
  candidate,
  candidates = [],
  jobs,
  templates,
  emailConfig,
  onClose,
  onSend,
  showToast,
  preselectedJobId
}: EmailComposeModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200);
  };

  const isCompany = candidate.id.startsWith('comp_') || !!candidate.currentCompany;
  const [recipientAudience, setRecipientAudience] = useState<'Candidate' | 'Company'>(isCompany ? 'Company' : 'Candidate');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [subject, setSubject] = useState<string>('Follow up: Regarding your application');
  const [body, setBody] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const [selectedInsertCandidateId, setSelectedInsertCandidateId] = useState<string>('');

  const getCandidateEmailSnippet = (cand: Candidate) => {
    return `\n\n--- Candidate Profile Summary ---\n• Name: ${cand.name}\n• Experience: ${cand.experience}\n• Key Skills: ${(cand.skills || []).slice(0, 5).join(', ')}\n• Current/Past: ${cand.currentCompany || 'N/A'}\n• Match Score: ${cand.aiMatchScore ? cand.aiMatchScore + '%' : 'N/A'}\n---------------------------------`;
  };

  // Auto-find a reasonable matching job for the candidate
  useEffect(() => {
    if (jobs.length > 0) {
      if (preselectedJobId) {
        setSelectedJobId(preselectedJobId);
      } else {
        const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
        const matchingJob = jobs.find(j => 
          j.requiredSkills.some(rs => candidateSkills.includes(rs.toLowerCase()))
        ) || jobs[0];
        
        setSelectedJobId(matchingJob.id);
      }
    }
  }, [jobs, candidate, preselectedJobId]);

  // Load selected template and fill in variables
  useEffect(() => {
    const activeJob = jobs.find(j => j.id === selectedJobId);
    
    if (selectedTemplateId && selectedTemplateId !== 'custom') {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        let finalSubject = template.subject
          .replace(/\{\{CandidateName\}\}/g, candidate.name)
          .replace(/\{\{candidate_name\}\}/g, candidate.name)
          .replace(/\{\{ContactPerson\}\}/g, candidate.name)
          .replace(/\{\{contact_person\}\}/g, candidate.name)
          .replace(/\{\{JobTitle\}\}/g, activeJob ? activeJob.title : 'the position')
          .replace(/\{\{job_title\}\}/g, activeJob ? activeJob.title : 'the position')
          .replace(/\{\{CompanyName\}\}/g, candidate.currentCompany || (activeJob ? (activeJob.companyName || 'Hirly - Recruitment') : 'Hirly - Recruitment'))
          .replace(/\{\{company_name\}\}/g, candidate.currentCompany || (activeJob ? (activeJob.companyName || 'Hirly - Recruitment') : 'Hirly - Recruitment'))
          .replace(/\{\{RecruiterName\}\}/g, 'Sarah Jenkins')
          .replace(/\{\{recruiter_name\}\}/g, 'Sarah Jenkins');

        let finalBody = template.body
          .replace(/\{\{CandidateName\}\}/g, candidate.name)
          .replace(/\{\{candidate_name\}\}/g, candidate.name)
          .replace(/\{\{ContactPerson\}\}/g, candidate.name)
          .replace(/\{\{contact_person\}\}/g, candidate.name)
          .replace(/\{\{JobTitle\}\}/g, activeJob ? activeJob.title : 'the position')
          .replace(/\{\{job_title\}\}/g, activeJob ? activeJob.title : 'the position')
          .replace(/\{\{CompanyName\}\}/g, candidate.currentCompany || (activeJob ? (activeJob.companyName || 'Hirly - Recruitment') : 'Hirly - Recruitment'))
          .replace(/\{\{company_name\}\}/g, candidate.currentCompany || (activeJob ? (activeJob.companyName || 'Hirly - Recruitment') : 'Hirly - Recruitment'))
          .replace(/\{\{RecruiterName\}\}/g, 'Sarah Jenkins')
          .replace(/\{\{recruiter_name\}\}/g, 'Sarah Jenkins');

        setSubject(finalSubject);
        setBody(finalBody);
      }
    } else if (selectedTemplateId === 'custom') {
      if (!subject && !body) {
        if (recipientAudience === 'Candidate') {
          setSubject(`Regarding position for ${candidate.name}`);
          setBody(`Dear ${candidate.name},\n\nI hope you are doing well.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`);
        } else {
          setSubject(`Collaboration update with ${candidate.currentCompany || 'your team'}`);
          setBody(`Dear ${candidate.name},\n\nI hope this email finds you well.\n\nI wanted to check in regarding your current hiring campaigns and candidate pipelines.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`);
        }
      }
    } else {
      if (recipientAudience === 'Candidate') {
        const defaultJobTitle = activeJob ? activeJob.title : 'Software Engineer';
        const defaultCompany = activeJob ? (activeJob.companyName || 'our partner agency') : 'our partner agency';
        setSubject(`Career Opportunity: ${defaultJobTitle} with ${defaultCompany}`);
        setBody(`Dear ${candidate.name},\n\nI hope this email finds you well. I was reviewing your impressive background, particularly your work as a software engineer, and I believe your experience would be an excellent fit for the ${defaultJobTitle} position at ${defaultCompany}.\n\nAre you available for a brief 15-minute call this week to discuss details?\n\nBest regards,\nSarah Jenkins\nLead Recruiter, Hirly - Recruitment`);
      } else {
        const companyLabel = candidate.currentCompany || 'your team';
        setSubject(`Recruitment Partnership Outreach: Hirly + ${companyLabel}`);
        setBody(`Hi ${candidate.name},\n\nI hope you're having a great week!\n\nI've been following ${companyLabel}'s impressive progress and noticed you are growing your tech team. At Hirly, we have a specialized pipeline of pre-vetted engineers who are open to new opportunities.\n\nAre you open to a brief 10-minute sync this week to explore how we can support your tech talent acquisition?\n\nBest regards,\nSarah Jenkins\nLead Partner, Hirly - Recruitment`);
      }
    }
  }, [selectedTemplateId, selectedJobId, candidate, templates, jobs, recipientAudience]);

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      if (!emailConfig.isConnected) {
        showToast('❌ Email failed to send: SMTP Configuration is not verified!', 'error');
        handleClose();
        return;
      }

      const log: CommunicationLog = {
        id: 'cl_' + Date.now(),
        candidateId: candidate.id,
        type: 'Email',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Sent',
        sentBy: 'Sarah Jenkins',
        subject: subject,
        message: body
      };

      onSend(log, true);
      showToast('✓ Email Sent Successfully!', 'success');
      handleClose();
    }, 1000);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 max-w-5xl w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-16 px-6 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">Compose Email</h3>
                <p className="text-[10px] text-slate-500 font-mono">Outbox Service: {emailConfig.provider}</p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-4">
              {!emailConfig.isConnected && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5 text-amber-800">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs text-amber-900">Email Setup Unverified</p>
                    <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed font-sans">Your email credentials have not been saved. Please configure SMTP in Settings to avoid delivery failures.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">
                    {recipientAudience === 'Candidate' ? 'To Candidate' : 'To Company Contact'}
                  </label>
                  <input 
                    type="text" 
                    readOnly 
                    value={`${candidate.name} <${candidate.email}>`}
                    className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Link to Job Position</label>
                  <select 
                    value={selectedJobId} 
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full h-[34px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-medium cursor-pointer"
                  >
                    {jobs.map(j => (
                      <option key={j.id} value={j.id} className="bg-white text-slate-800">{j.title} ({j.companyName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Choose Email Template
                  </label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientAudience('Candidate');
                        setSelectedTemplateId('custom');
                        setSubject(`Regarding position for ${candidate.name}`);
                        setBody(`Dear ${candidate.name},\n\nI hope this email finds you well.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`);
                      }}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${recipientAudience === 'Candidate' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      👤 Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientAudience('Company');
                        setSelectedTemplateId('custom');
                        setSubject(`Collaboration update with ${candidate.currentCompany || 'your team'}`);
                        setBody(`Dear ${candidate.name},\n\nI hope this email finds you well.\n\nI wanted to check in regarding our collaboration.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`);
                      }}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${recipientAudience === 'Company' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🏢 Company
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId('custom');
                      if (recipientAudience === 'Candidate') {
                        setSubject(`Regarding position for ${candidate.name}`);
                        setBody(`Dear ${candidate.name},\n\nI hope this email finds you well.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`);
                      } else {
                        setSubject(`Collaboration update with ${candidate.currentCompany || 'your team'}`);
                        setBody(`Dear ${candidate.name},\n\nI hope this email finds you well.\n\nI wanted to check in regarding our collaboration.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`);
                      }
                    }}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTemplateId === 'custom' || selectedTemplateId === ''
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      <span>Custom Email</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 truncate font-sans">Draft a blank/custom message</p>
                  </button>

                  {templates
                    .filter(t => (t.audience || 'Candidate') === recipientAudience)
                    .map(t => {
                      const isSelected = selectedTemplateId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                            <Mail className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                            <span>{t.name}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 truncate font-sans">{t.category} preset template</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {recipientAudience === 'Company' && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2.5 animate-fade-in shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono text-blue-800 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-blue-600" /> Insert Candidate Highlights
                    </label>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-semibold">Company Client Mode</span>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <select
                      value={selectedInsertCandidateId}
                      onChange={(e) => setSelectedInsertCandidateId(e.target.value)}
                      className="flex-1 h-8 px-2 py-1 text-xs border border-blue-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="">-- Select Candidate to Pitch --</option>
                      {(candidates || [])
                        .filter(c => c.id !== candidate.id && !c.id.startsWith('comp_'))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({(c.skills || []).slice(0, 2).join(', ')})</option>
                        ))}
                    </select>
                  </div>

                  {selectedInsertCandidateId && (() => {
                    const targetCand = (candidates || []).find(c => c.id === selectedInsertCandidateId);
                    if (!targetCand) return null;
                    return (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-white rounded-lg border border-blue-100 text-[10px] space-y-1 text-slate-600 shadow-2xs">
                          <p><strong className="text-slate-800 font-sans">Experience:</strong> {targetCand.experience}</p>
                          <p><strong className="text-slate-800 font-sans">Skills:</strong> {(targetCand.skills || []).slice(0, 4).join(', ')}</p>
                          <p><strong className="text-slate-800 font-sans">Education:</strong> {targetCand.education || 'N/A'}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const snippet = getCandidateEmailSnippet(targetCand);
                              setBody(prev => prev + snippet);
                              showToast(`✓ Inserted ${targetCand.name}'s profile summary`, 'success');
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Plus className="h-3 w-3" /> Full Profile Summary
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBody(prev => prev.replace(/\{\{CandidateName\}\}/gi, targetCand.name));
                              setSubject(prev => prev.replace(/\{\{CandidateName\}\}/gi, targetCand.name));
                              if (!body.includes('{{CandidateName}}') && !subject.includes('{{CandidateName}}')) {
                                setBody(prev => prev + ' ' + targetCand.name);
                              }
                              showToast(`✓ Applied ${targetCand.name} as CandidateName`, 'success');
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer transition-all"
                          >
                            Name Only
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const skillsText = (targetCand.skills || []).slice(0, 4).join(', ');
                              setBody(prev => prev.replace(/\{\{CandidateSkills\}\}/gi, skillsText));
                              if (!body.includes('{{CandidateSkills}}')) {
                                setBody(prev => prev + ' ' + skillsText);
                              }
                              showToast(`✓ Inserted skills: ${skillsText}`, 'success');
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer transition-all"
                          >
                            Skills Only
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Subject Line</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject line..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 bg-white text-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Email Body</label>
                <textarea 
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email body here..."
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 bg-white text-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-sans leading-relaxed resize-none placeholder-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Right Column: Live Email Preview */}
            <div className="flex flex-col h-full min-h-[350px]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Inbox Preview
                </label>
                <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-bold">
                  Responsive Mockup
                </span>
              </div>

              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-inner">
                <div className="p-4 border-b border-slate-200 bg-slate-100/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-medium font-sans">From:</span>
                      <span className="text-slate-700 font-semibold font-sans">{emailConfig.username || 'sarah.j@apexstaffing.com'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500 font-medium font-sans">To:</span>
                    <span className="text-blue-600 font-semibold font-sans">{candidate.email}</span>
                  </div>
                  <div className="pt-1 flex items-start gap-1 text-[11px]">
                    <span className="text-slate-500 font-medium shrink-0 font-sans">Subject:</span>
                    <span className="text-slate-800 font-bold leading-tight font-sans">{subject || '(No Subject)'}</span>
                  </div>
                </div>

                <div className="flex-1 p-5 bg-white text-slate-800 overflow-y-auto font-sans leading-relaxed text-xs">
                  {body ? (
                    <div className="whitespace-pre-line text-slate-700 select-text">
                      {body}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic select-none">
                      Start drafting your email to see the real-time preview here...
                    </div>
                  )}
                  
                  <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-sans">
                    <span className="font-mono text-slate-405">Hirly Outbox Integration</span>
                    <span className="font-sans text-[9px] text-slate-405">Secured with TLS 1.3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-505 font-sans">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Sends via integrated {emailConfig.provider} connection.</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button 
                onClick={handleSend}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer font-sans select-none"
              >
                {isSending ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Outbox
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
