import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Check, AlertCircle, HelpCircle, MessageSquare, Calendar, Phone, CheckSquare, Clock, Sparkles, CheckCheck, Plus, Copy, ExternalLink } from 'lucide-react';
import { Candidate, Job, EmailTemplate, EmailConfig, CommunicationLog, Task } from '../types';

// ============================================================================
// EMAIL COMPOSE MODAL
// ============================================================================
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
        // Look for a job where candidate's skills overlap, or default to first
        const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
        const matchingJob = jobs.find(j => 
          j.requiredSkills.some(rs => candidateSkills.includes(rs.toLowerCase()))
        ) || jobs[0];
        
        setSelectedJobId(matchingJob.id);
      }
    }
  }, [jobs, candidate, preselectedJobId]);

  // Load selected template and fill in variables (supporting both lowercase and PascalCase variables)
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
          .replace(/\{\{CompanyName\}\}/g, candidate.currentCompany || (activeJob ? activeJob.companyName : 'Hirly - Recruitment'))
          .replace(/\{\{company_name\}\}/g, candidate.currentCompany || (activeJob ? activeJob.companyName : 'Hirly - Recruitment'))
          .replace(/\{\{RecruiterName\}\}/g, 'Sarah Jenkins')
          .replace(/\{\{recruiter_name\}\}/g, 'Sarah Jenkins');

        let finalBody = template.body
          .replace(/\{\{CandidateName\}\}/g, candidate.name)
          .replace(/\{\{candidate_name\}\}/g, candidate.name)
          .replace(/\{\{ContactPerson\}\}/g, candidate.name)
          .replace(/\{\{contact_person\}\}/g, candidate.name)
          .replace(/\{\{JobTitle\}\}/g, activeJob ? activeJob.title : 'the position')
          .replace(/\{\{job_title\}\}/g, activeJob ? activeJob.title : 'the position')
          .replace(/\{\{CompanyName\}\}/g, candidate.currentCompany || (activeJob ? activeJob.companyName : 'Hirly - Recruitment'))
          .replace(/\{\{company_name\}\}/g, candidate.currentCompany || (activeJob ? activeJob.companyName : 'Hirly - Recruitment'))
          .replace(/\{\{RecruiterName\}\}/g, 'Sarah Jenkins')
          .replace(/\{\{recruiter_name\}\}/g, 'Sarah Jenkins');

        setSubject(finalSubject);
        setBody(finalBody);
      }
    } else if (selectedTemplateId === 'custom') {
      // Do not overwrite manual modifications. Only initialize if both are empty.
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
      // General outreach body default
      if (recipientAudience === 'Candidate') {
        const defaultJobTitle = activeJob ? activeJob.title : 'Software Engineer';
        const defaultCompany = activeJob ? activeJob.companyName : 'our partner agency';
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
      // Verify email configuration is connected
      if (!emailConfig.isConnected) {
        showToast('❌ Email failed to send: SMTP Configuration is not verified!', 'error');
        onClose();
        return;
      }

      // Record in logs
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
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 max-w-5xl w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
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
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content - Two Column Bento Grid layout */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Form Controls & Inputs (Light Theme) */}
          <div className="space-y-4">
            {!emailConfig.isConnected && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5 text-amber-800">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs text-amber-900">Email Setup Unverified</p>
                  <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">Your email credentials have not been saved. Please configure SMTP in Settings to avoid delivery failures.</p>
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
                {/* Custom / Blank Option */}
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
                  <p className="text-[9px] text-slate-400 mt-1 truncate">Draft a blank/custom message</p>
                </button>

                {/* Preset Templates */}
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
                        <p className="text-[9px] text-slate-400 mt-1 truncate">{t.category} preset template</p>
                      </button>
                    );
                  })}
              </div>
            </div>

            {recipientAudience === 'Company' && (
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2.5 animate-fade-in">
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
                      <div className="p-2.5 bg-white rounded-lg border border-blue-100 text-[10px] space-y-1 text-slate-600">
                        <p><strong className="text-slate-800">Experience:</strong> {targetCand.experience}</p>
                        <p><strong className="text-slate-800">Skills:</strong> {(targetCand.skills || []).slice(0, 4).join(', ')}</p>
                        <p><strong className="text-slate-800">Education:</strong> {targetCand.education || 'N/A'}</p>
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

          {/* Right Column: Live Email Preview (Bento Grid Theme) */}
          <div className="flex flex-col h-full min-h-[350px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Inbox Preview
              </label>
              <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                Responsive Mockup
              </span>
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-inner">
              {/* Fake Email Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-100/50 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">From:</span>
                    <span className="text-slate-700 font-semibold">{emailConfig.username || 'sarah.j@apexstaffing.com'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500 font-medium">To:</span>
                  <span className="text-blue-600 font-semibold">{candidate.email}</span>
                </div>
                <div className="pt-1 flex items-start gap-1 text-[11px]">
                  <span className="text-slate-500 font-medium shrink-0">Subject:</span>
                  <span className="text-slate-800 font-bold leading-tight">{subject || '(No Subject)'}</span>
                </div>
              </div>

              {/* Fake Email Body Container with white text for optimal readability */}
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
                
                {/* Visual signature separator */}
                <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="font-mono text-slate-400">Hirly Outbox Integration</span>
                  <span className="font-sans text-[9px] text-slate-400">Secured with TLS 1.3</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <span>Sends via integrated {emailConfig.provider} connection.</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
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
    </div>
  );
}

// ============================================================================
// WHATSAPP COMPOSE MODAL
// ============================================================================
interface WhatsAppComposeModalProps {
  candidate: Candidate;
  candidates?: Candidate[];
  jobs: Job[];
  companyName: string;
  preselectedJob?: Job;
  onClose: () => void;
  onSend: (log: CommunicationLog, autoCreateTask: boolean) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function WhatsAppComposeModal({
  candidate,
  candidates = [],
  jobs = [],
  companyName,
  preselectedJob,
  onClose,
  onSend,
  showToast
}: WhatsAppComposeModalProps) {
  const isCompany = candidate.id.startsWith('comp_') || !!candidate.currentCompany;
  const [recipientAudience, setRecipientAudience] = useState<'Candidate' | 'Company'>(isCompany ? 'Company' : 'Candidate');
  const [selectedJobId, setSelectedJobId] = useState<string>(preselectedJob?.id || (jobs[0]?.id || ''));
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>(isCompany ? 'partnership' : 'pitch');
  const [customExtraText, setCustomExtraText] = useState<string>('');

  const [selectedInsertCandidateId, setSelectedInsertCandidateId] = useState<string>('');

  const getCandidateWhatsAppSnippet = (cand: Candidate) => {
    return `\n\n*Candidate Profile Summary:*\n• *Name:* ${cand.name}\n• *Experience:* ${cand.experience}\n• *Key Skills:* ${(cand.skills || []).slice(0, 4).join(', ')}\n• *Current:* ${cand.currentCompany || 'N/A'}`;
  };

  const currentJob = jobs.find(j => j.id === selectedJobId) || preselectedJob;

  // Build template on initial load or when candidate, job, active template or audience changes
  useEffect(() => {
    buildTemplate(activeTemplate, currentJob);
  }, [candidate, companyName, selectedJobId, activeTemplate, recipientAudience]);

  const buildTemplate = (type: string, jobObj?: Job) => {
    if (type === 'custom') return; // Don't overwrite if manual adjustments are made
    
    let text = '';
    const name = candidate.name;
    const compName = jobObj ? jobObj.companyName : (candidate.currentCompany || companyName || 'your company');

    switch (type) {
      // Candidate templates
      case 'pitch':
        if (jobObj) {
          text = `Hello ${name},\n\nI hope you're doing well! I came across your impressive profile and thought you'd be a stellar match for the *${jobObj.title}* opportunity at *${compName}*.\n\n*Quick Job Details:*\n📍 Location: ${jobObj.location}\n💼 Experience: ${jobObj.experience}\n🛠️ Required: ${(jobObj.requiredSkills || []).slice(0, 3).join(', ')}\n\nWould you be open to a brief call to see if this aligns with your career goals?`;
        } else {
          text = `Hello ${name},\n\nI hope you're doing well! I came across your professional profile and would love to connect with you regarding active recruiting opportunities that align with your background.\n\nAre you open to a brief chat this week?`;
        }
        break;
      case 'schedule':
        if (jobObj) {
          text = `Hi ${name}!\n\nThis is Sarah from Hirly. Our team was highly impressed by your application for the *${jobObj.title}* role at *${compName}*.\n\nWe would love to schedule a brief 15-minute introductory video screening. Please let me know if you have availability this or next week!`;
        } else {
          text = `Hi ${name}!\n\nThis is Sarah from Hirly. I'd love to schedule a brief 15-minute introductory video call to learn more about your career path and some of our active roles.\n\nPlease let me know your general availability!`;
        }
        break;
      case 'generic':
        text = `Hello ${name},\n\nHope your week is off to a great start! Just checking in to see if you are currently open to exploring new professional opportunities.\n\nLet me know if we can share a few roles that might fit your profile.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment`;
        break;

      // Company templates
      case 'partnership':
        text = `Hello ${name},\n\nI hope you're having a great week! I've been following *${compName}* and noticed you are expanding your engineering teams.\n\nAt Hirly, we specialize in sourcing top-tier technical talent. We have 3 exceptionally strong developers in our active pipeline this week who match your industry focus.\n\nAre you open to a brief WhatsApp sync or 10-minute call to see if we can streamline your hiring?`;
        break;
      case 'candidate_sub':
        text = `Hi ${name}!\n\nI wanted to share a quick profile with you. We are currently representing an outstanding Senior Engineer with extensive React & Node.js experience who is highly interested in *${compName}*.\n\nThey have successfully scaled platforms from zero to millions of active users and are looking for their next challenge.\n\nShould I send over their anonymized resume for your team to review?`;
        break;
      case 'generic_company':
        text = `Hello ${name},\n\nHope your week is going great! Just checking in to see how your current tech hiring is progressing at *${compName}*.\n\nLet me know if there are any urgent backend or frontend roles you need support filling this month.\n\nBest regards,\nSarah Jenkins\nLead Partner, Hirly`;
        break;
    }
    setMessage(text);
  };

  const hasPhone = candidate.phone && candidate.phone.replace(/\D/g, '').length >= 7;

  const handleSend = () => {
    if (!hasPhone) {
      showToast('❌ Failed: Candidate phone number is invalid or missing!', 'error');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);

      // Clean phone number (keep only digits)
      const cleanPhone = candidate.phone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(message);
      
      // Direct deep link or direct WhatsApp Web chat depending on user-agent to bypass any landing page
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const waUrl = isMobile 
        ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
        : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      
      window.open(waUrl, '_blank');

      // Add to communication history
      const log: CommunicationLog = {
        id: 'cl_' + Date.now(),
        candidateId: candidate.id,
        type: 'WhatsApp',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Sent',
        sentBy: 'Sarah Jenkins',
        subject: 'WhatsApp Outreach Message',
        message: message
      };

      onSend(log, true);
      showToast('✓ Launching WhatsApp Client...', 'success');
      onClose();
    }, 1000);
  };

  // Helper functions to append information to the message text area
  const appendText = (textToAppend: string) => {
    setMessage(prev => prev ? `${prev}\n\n${textToAppend}` : textToAppend);
  };

  const handleInsertJobDetails = () => {
    if (!currentJob) {
      showToast('⚠️ No job selected to insert details!', 'error');
      return;
    }
    const details = `*Position Details:*\n- Title: ${currentJob.title}\n- Company: ${currentJob.companyName}\n- Location: ${currentJob.location}\n- Salary: ${currentJob.salary || 'Competitive'}`;
    appendText(details);
    showToast('✓ Job details appended!', 'success');
  };

  const handleInsertSkills = () => {
    if (!currentJob) {
      showToast('⚠️ No job selected to insert requirements!', 'error');
      return;
    }
    const skillsText = `*Required Skills & Stack:*\n${currentJob.requiredSkills.map(s => `• ${s}`).join('\n')}`;
    appendText(skillsText);
    showToast('✓ Skills & requirements appended!', 'success');
  };

  const handleInsertCalendly = () => {
    const calendlyText = `📅 *Schedule a slot directly on my calendar:* https://calendly.com/sarah-jenkins-hirly/15min`;
    appendText(calendlyText);
    showToast('✓ Calendly scheduler link appended!', 'success');
  };

  const handleInsertPerks = () => {
    const perksText = `🚀 *Key Benefits & Perks:*\n• Fully remote flexible hours\n• Unlimited paid time off (PTO)\n• Comprehensive top-tier health coverage\n• Dedicated home office setup stipend`;
    appendText(perksText);
    showToast('✓ Benefits & perks appended!', 'success');
  };

  const handleInsertSignature = () => {
    const signatureText = `Warmly,\nSarah Jenkins\nPrincipal Talent Partner | Hirly`;
    appendText(signatureText);
    showToast('✓ Professional signature appended!', 'success');
  };

  const handleInsertCustomExtra = () => {
    if (!customExtraText.trim()) {
      showToast('⚠️ Please write some extra text to insert first!', 'error');
      return;
    }
    appendText(customExtraText.trim());
    setCustomExtraText('');
    showToast('✓ Extra custom text appended!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 max-w-5xl w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">Compose WhatsApp Message</h3>
              <p className="text-[10px] text-slate-500 font-mono">Recipient Client: WhatsApp Web & App Link</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Bento Box Layout */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
          
          {/* Left Column: Form Controls & Custom Builders */}
          <div className="space-y-4">
            
            {/* Delivery target */}
            {!hasPhone ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2.5 text-rose-800">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs text-rose-900">Missing Phone Number</p>
                  <p className="text-[10px] text-rose-700 mt-0.5 leading-relaxed">
                    This candidate does not have a valid telephone number listed ("{candidate.phone || 'None'}"). Please configure a phone number to enable messaging.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex gap-3 text-slate-700">
                <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0 mt-0.5">
                  {candidate.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Delivery Recipient</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {candidate.name} • {candidate.phone}
                  </p>
                </div>
              </div>
            )}

            {/* Select Associated Job Position */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Select Active Job Position</label>
              <select 
                value={selectedJobId} 
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setActiveTemplate('pitch'); // automatically update template on change
                }}
                className="w-full h-[36px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
              >
                <option value="" className="text-slate-400">-- None (Generic Profile Chat) --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id} className="text-slate-800">{j.title} ({j.companyName})</option>
                ))}
              </select>
            </div>

            {/* Base Templates Grid Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" /> WhatsApp Outreach Templates
                </label>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientAudience('Candidate');
                      setActiveTemplate('pitch');
                    }}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${recipientAudience === 'Candidate' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    👤 Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientAudience('Company');
                      setActiveTemplate('partnership');
                    }}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${recipientAudience === 'Company' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    🏢 Company
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(recipientAudience === 'Candidate' ? [
                  { id: 'pitch', label: '🔥 Cold Pitch', desc: 'Outreach & interest check' },
                  { id: 'schedule', label: '📅 Schedule Sync', desc: 'Invite to screening' },
                  { id: 'generic', label: '💬 General Check', desc: 'Inquire about career search' }
                ] : [
                  { id: 'partnership', label: '🤝 Partnership', desc: 'Client recruitment pitch' },
                  { id: 'candidate_sub', label: '💼 Candidate Sub', desc: 'Showcase strong candidate' },
                  { id: 'generic_company', label: '💬 Relationship', desc: 'Hiring pipeline follow-up' }
                ]).map(t => {
                  const isActive = activeTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveTemplate(t.id);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs ring-1 ring-emerald-500/20 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <div className="font-bold text-[11px] truncate">{t.label}</div>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate leading-tight">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {recipientAudience === 'Company' && (
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono text-emerald-800 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-emerald-600" /> Insert Candidate Highlights
                  </label>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-semibold">Company Client Mode</span>
                </div>
                
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedInsertCandidateId}
                    onChange={(e) => setSelectedInsertCandidateId(e.target.value)}
                    className="flex-1 h-8 px-2 py-1 text-xs border border-emerald-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
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
                    <div className="space-y-1.5">
                      <div className="p-2 bg-white rounded-lg border border-emerald-100 text-[10px] space-y-0.5 text-slate-600">
                        <p><strong className="text-slate-800">Experience:</strong> {targetCand.experience}</p>
                        <p><strong className="text-slate-800">Skills:</strong> {(targetCand.skills || []).slice(0, 4).join(', ')}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = getCandidateWhatsAppSnippet(targetCand);
                            setMessage(prev => prev + snippet);
                            showToast(`✓ Inserted ${targetCand.name}'s profile summary`, 'success');
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                        >
                          <Plus className="h-3 w-3" /> Full Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(prev => prev + ' ' + targetCand.name);
                            showToast(`✓ Inserted name: ${targetCand.name}`, 'success');
                          }}
                          className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer transition-all"
                        >
                          Name
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const skillsText = (targetCand.skills || []).slice(0, 4).join(', ');
                            setMessage(prev => prev + ' (' + skillsText + ')');
                            showToast(`✓ Inserted skills: ${skillsText}`, 'success');
                          }}
                          className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer transition-all"
                        >
                          Skills
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Extra Details Quick Insertion Chips */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">
                Insert Job Details & Extras
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleInsertJobDetails}
                  disabled={!currentJob}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Insert basic job parameters (title, location, salary)"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Job Details
                </button>
                <button
                  type="button"
                  onClick={handleInsertSkills}
                  disabled={!currentJob}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Insert required skills bullet list"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Required Skills
                </button>
                <button
                  type="button"
                  onClick={handleInsertCalendly}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                  title="Insert quick Calendly scheduling URL"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Calendly Link
                </button>
                <button
                  type="button"
                  onClick={handleInsertPerks}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                  title="Insert list of standard benefits"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Work Perks
                </button>
                <button
                  type="button"
                  onClick={handleInsertSignature}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                  title="Insert professional signature sign-off"
                >
                  <Plus className="h-3 w-3 text-emerald-600" /> Signature
                </button>
              </div>
            </div>

            {/* Custom Extra Snippet Text Box */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                Custom Extra Snippet (Write & append)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Interviewing this Thursday afternoon..."
                  value={customExtraText}
                  onChange={(e) => setCustomExtraText(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-[11px] border border-slate-200 bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleInsertCustomExtra}
                  className="px-3 py-1.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-3 w-3" /> Append
                </button>
              </div>
            </div>

            {/* Main Message Textbox */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                  WhatsApp Message Draft
                </label>
                <span className="text-[9px] text-slate-400 font-mono">
                  {message.length} chars • {message.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea 
                rows={7}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setActiveTemplate('custom');
                }}
                disabled={!hasPhone}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 bg-white text-slate-850 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-sans leading-relaxed resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                placeholder="Draft your WhatsApp outreach message here..."
              />
            </div>
          </div>

          {/* Right Column: Live Mobile WhatsApp Chat Preview */}
          <div className="flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Mobile Chat Preview
              </label>
              <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-150">
                Official WA Formatting
              </span>
            </div>

            {/* Mobile Outer Container */}
            <div className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-inner relative max-h-[500px] min-h-[380px]">
              
              {/* Fake Phone Screen Header */}
              <div className="px-4 py-2.5 bg-emerald-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 border border-emerald-500 flex items-center justify-center font-bold text-[11px] uppercase">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold leading-tight truncate max-w-[150px]">{candidate.name}</h4>
                    <p className="text-[9px] text-emerald-200 leading-none">Online</p>
                  </div>
                </div>
                <div className="flex gap-3 text-emerald-100">
                  <Phone className="h-3.5 w-3.5" />
                  <div className="h-3.5 w-3.5 border-r-2 border-t-2 border-emerald-100 transform rotate-45 shrink-0 scale-75 mt-0.5" />
                </div>
              </div>

              {/* Chat Canvas (WhatsApp Background pattern emulation) */}
              <div 
                className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3"
                style={{
                  backgroundColor: '#efeae2',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z'/%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                {/* Date bubble indicator */}
                <div className="self-center bg-[#d1e4fc]/90 shadow-2xs rounded-lg px-2.5 py-1 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
                  Today
                </div>

                {/* Left Bubble (Candidate's potential query placeholder, optional) */}
                <div className="self-start bg-white text-slate-800 rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-xs text-[11px] leading-relaxed relative">
                  Hi Sarah, I saw your recruitment agency profile on Hirly. What positions are active now?
                  <span className="absolute top-0 -left-1 text-white text-xs">◀</span>
                  <div className="text-right text-[8px] text-slate-400 mt-1">10:41 AM</div>
                </div>

                {/* Right Bubble (Recruiter Message Live Preview) */}
                <div className="self-end bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-none p-3.5 max-w-[85%] shadow-xs text-[11.5px] leading-relaxed relative">
                  <span className="absolute top-0 -right-1.5 text-[#d9fdd3] text-sm">▶</span>
                  {message ? (
                    <div className="whitespace-pre-wrap select-text">
                      {/* Bold converter emulating whatsapp asterisks */}
                      {message.split('\n').map((line, idx) => {
                        // Regex to substitute *text* with bold spans in presentation mode
                        const parts = line.split(/(\*[^*]+\*)/g);
                        return (
                          <div key={idx}>
                            {parts.map((part, i) => {
                              if (part.startsWith('*') && part.endsWith('*')) {
                                return <strong key={i} className="font-bold text-slate-900">{part.slice(1, -1)}</strong>;
                              }
                              return part;
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic select-none">
                      Draft your WhatsApp message or select a preset template on the left...
                    </span>
                  )}
                  <div className="flex justify-end items-center gap-1 text-[8px] text-slate-500 mt-1.5">
                    <span>Just Now</span>
                    <CheckCheck className="h-3 w-3 text-sky-500" />
                  </div>
                </div>
              </div>

              {/* Fake Message Input Footer */}
              <div className="px-3 py-2 bg-[#f0f2f5] flex items-center gap-2 border-t shrink-0">
                <div className="flex-1 bg-white rounded-full px-4 py-1.5 text-[10px] text-slate-400 border border-slate-150 truncate">
                  Type a message...
                </div>
                <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <span>Clicking launch will open your browser's WhatsApp client securely.</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              disabled={isSending || !hasPhone}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparing WA...
                </>
              ) : (
                <>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERVIEW SCHEDULER MODAL
// ============================================================================
interface InterviewSchedulerModalProps {
  candidate: Candidate;
  jobs: Job[];
  onClose: () => void;
  onSchedule: (title: string, date: string, log: CommunicationLog, autoCreateTask: boolean) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function InterviewSchedulerModal({
  candidate,
  jobs,
  onClose,
  onSchedule,
  showToast
}: InterviewSchedulerModalProps) {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
    // Default tomorrow as candidate date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setInterviewDate(tomorrow.toISOString().split('T')[0]);
  }, [jobs]);

  const handleSchedule = () => {
    if (!interviewDate) {
      showToast('❌ Please select a valid date.', 'error');
      return;
    }

    setIsScheduling(true);
    setTimeout(() => {
      setIsScheduling(false);

      const job = jobs.find(j => j.id === selectedJobId) || jobs[0];
      const sessionTitle = `Interview for ${job.title} at ${job.companyName}`;

      const log: CommunicationLog = {
        id: 'cl_' + Date.now(),
        candidateId: candidate.id,
        type: 'Interview',
        date: `${interviewDate} ${interviewTime}`,
        status: 'Sent',
        sentBy: 'Sarah Jenkins',
        subject: `Interview Invitation: ${sessionTitle}`,
        message: `Scheduled standard recruitment assessment. Notes: ${notes || 'None'}`
      };

      onSchedule(sessionTitle, `${interviewDate} ${interviewTime}`, log, true);
      showToast('✓ Interview Scheduled & Calendar Event Dispatched!', 'success');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden animate-scale-up">
        <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">Schedule Interview</h3>
              <p className="text-[10px] text-slate-400 font-mono">Assigned Recruiter: Sarah Jenkins</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Candidate</label>
            <input 
              type="text" 
              readOnly 
              value={candidate.name}
              className="w-full px-3 py-1.5 text-xs border border-slate-150 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Target Job Position</label>
            <select 
              value={selectedJobId} 
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} ({j.companyName})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Session Date</label>
              <input 
                type="date" 
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Session Time</label>
              <input 
                type="time" 
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Brief Agenda / Notes</label>
            <textarea 
              rows={3}
              placeholder="e.g. Design portfolio walkthrough, API deep-dive..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
          <button 
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSchedule}
            disabled={isScheduling}
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5"
          >
            {isScheduling ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="h-3.5 w-3.5" />
                Confirm Assessment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADD TASK MODAL
// ============================================================================
interface AddTaskModalProps {
  candidate: Candidate;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function AddTaskModal({
  candidate,
  onClose,
  onAddTask,
  showToast
}: AddTaskModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<Task['type']>('Call');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Default due tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split('T')[0]);
    setTaskTitle(`Follow up with ${candidate.name}`);
  }, [candidate]);

  const handleSubmit = () => {
    if (!taskTitle.trim() || !dueDate) {
      showToast('❌ Please complete all task fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const task: Task = {
        id: 't_' + Date.now(),
        type: taskType,
        title: taskTitle,
        candidateId: candidate.id,
        candidateName: candidate.name,
        priority: priority,
        status: 'Pending',
        dueDate: dueDate
      };

      onAddTask(task);
      showToast('✓ Task created successfully!', 'success');
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden animate-scale-up">
        <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">Create Custom Task</h3>
              <p className="text-[10px] text-slate-400 font-mono">Linked candidate: {candidate.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Task Description / Title</label>
            <input 
              type="text" 
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Conduct second round coding assessment"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Task Type</label>
              <select 
                value={taskType} 
                onChange={(e) => setTaskType(e.target.value as Task['type'])}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Interview">Interview</option>
                <option value="Document">Document</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Priority</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
          <button 
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
