import React, { useState, useEffect } from 'react';
import { X, Mail, Paperclip, Sparkles, Send, FileText, ChevronDown, Check, User, Trash2 } from 'lucide-react';
import { Candidate, Company, Job } from '../../types';
import AnimatedModal from '../AnimatedModal';
import Portal from '../Portal';
import { supabase } from '../../utils/supabase';

interface EmailCenterComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  jobs: Job[];
  companies: Company[];
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
  initialCandidateId?: string;
  threadId?: string;
  showToast: (text: string, type: 'success' | 'error') => void;
  onSuccess?: () => void;
}

export interface EmailTemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

export function EmailCenterComposeModal({
  isOpen,
  onClose,
  candidates = [],
  jobs = [],
  companies = [],
  initialRecipient = '',
  initialSubject = '',
  initialBody = '',
  initialCandidateId = '',
  threadId,
  showToast,
  onSuccess,
}: EmailCenterComposeModalProps) {
  const [open, setOpen] = useState(isOpen);
  const [to, setTo] = useState(initialRecipient);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  const [selectedCandidateId, setSelectedCandidateId] = useState(initialCandidateId);
  const [attachments, setAttachments] = useState<{ filename: string; fileSize: number; mimeType: string }[]>([]);
  
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTo(initialRecipient);
      setSubject(initialSubject);
      setBodyHtml(initialBody);
      setSelectedCandidateId(initialCandidateId);

      // Fetch templates from backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || '';
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token || '';
        fetch(`${backendUrl}/api/email-center/templates`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(res => res.json())
          .then(data => {
            if (data.templates) setTemplates(data.templates);
          })
          .catch(() => {});
      });
    }
  }, [isOpen, initialRecipient, initialSubject, initialBody, initialCandidateId]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const handleSelectCandidate = (cand: Candidate) => {
    setTo(cand.email);
    setSelectedCandidateId(cand.id);
    setCandidateSearchQuery(cand.name);
    setShowCandidateDropdown(false);
  };

  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;

    const cand = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
    const job = jobs.find(j => j.id === (cand as any)?.jobId) || jobs[0];
    const comp = companies.find(co => co.id === job?.companyId) || companies[0];

    const candidateName = cand ? cand.name : 'Candidate';
    const jobTitle = job ? job.title : 'Position';
    const companyName = comp ? comp.name : 'Agency';
    const recruiterName = 'Recruitment Team';

    let interpolatedSubject = tpl.subject
      .replace(/\{\{candidate_name\}\}/g, candidateName)
      .replace(/\{\{job_title\}\}/g, jobTitle)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{recruiter_name\}\}/g, recruiterName);

    let interpolatedBody = tpl.bodyHtml
      .replace(/\{\{candidate_name\}\}/g, candidateName)
      .replace(/\{\{job_title\}\}/g, jobTitle)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{recruiter_name\}\}/g, recruiterName);

    setSubject(interpolatedSubject);
    setBodyHtml(interpolatedBody);
    showToast(`✓ Applied template: ${tpl.name}`, 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAtts = Array.from(files).map(file => ({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream'
    }));

    setAttachments(prev => [...prev, ...newAtts]);
    showToast(`✓ Added ${newAtts.length} attachment(s)`, 'success');
  };

  const handleAiDraft = () => {
    setIsAiDrafting(true);
    setTimeout(() => {
      setIsAiDrafting(false);
      const cand = candidates.find(c => c.id === selectedCandidateId);
      const candName = cand ? cand.name : 'Candidate';
      
      setSubject(`Career Opportunity & Screening Interview - Hirly Talent Acquisition`);
      setBodyHtml(`<p>Dear ${candName},</p><p>I came across your profile and was very impressed by your qualifications and hands-on experience. We currently represent several top-tier engineering teams looking for talented professionals.</p><p>Are you open for a brief 15-minute intro call this week to discuss active hiring opportunities matching your expertise?</p><p>Looking forward to connecting!</p><p>Best regards,<br/>Senior Talent Acquisition Desk</p>`);
      showToast(`✨ Generated AI email draft!`, 'success');
    }, 800);
  };

  const handleSend = async () => {
    if (!to || !to.trim()) {
      showToast('⚠️ Please enter a recipient email address', 'error');
      return;
    }
    if (!subject || !subject.trim()) {
      showToast('⚠️ Please enter an email subject line', 'error');
      return;
    }

    try {
      setIsSending(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          to,
          cc,
          bcc,
          subject,
          bodyHtml,
          candidateId: selectedCandidateId,
          threadId,
          attachments,
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to dispatch email');
      }

      showToast(`✓ Email sent successfully to ${to}!`, 'success');
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err: any) {
      showToast(`❌ Error sending email: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(candidateSearchQuery.toLowerCase())
  );

  return (
    <AnimatedModal isOpen={open} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/30 border border-blue-400/30 rounded-xl">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-sans text-white">Compose Email (Communication Center)</h3>
                <p className="text-xs text-slate-400">Direct ATS candidate outreach & client communications.</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Recipient Input + Candidate Search */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 font-sans">To (Recipient Email)</label>
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  {showCcBcc ? '- Hide Cc/Bcc' : '+ Cc / Bcc'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setCandidateSearchQuery(e.target.value);
                    setShowCandidateDropdown(true);
                  }}
                  onFocus={() => setShowCandidateDropdown(true)}
                  placeholder="e.g. candidate@gmail.com or search candidate name..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                />
                {showCandidateDropdown && filteredCandidates.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto p-1">
                    {filteredCandidates.slice(0, 5).map(cand => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => handleSelectCandidate(cand)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{cand.name}</p>
                            <p className="text-[10px] text-slate-500">{cand.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {cand.designation || 'Candidate'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cc & Bcc Inputs */}
            {showCcBcc && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="text-xs font-bold text-slate-700 font-sans block mb-1">Cc</label>
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@company.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 font-sans block mb-1">Bcc</label>
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@company.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Template Selector & AI Copilot Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-1">
                <FileText className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Apply Recruitment Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAiDraft}
                disabled={isAiDrafting}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                {isAiDrafting ? 'Drafting AI...' : 'Draft with AI'}
              </button>
            </div>

            {/* Subject Line */}
            <div>
              <label className="text-xs font-bold text-slate-700 font-sans block mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Interview Scheduling - Senior Frontend Engineer"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Rich Email Content Textarea */}
            <div>
              <label className="text-xs font-bold text-slate-700 font-sans block mb-1">Email Body (HTML/Rich Text)</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={8}
                placeholder="Type your email message here or apply a recruitment template above..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:bg-white focus:border-blue-500 focus:outline-none font-sans"
              />
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-slate-600 font-sans">Attached Files ({attachments.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                      <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate max-w-xs">{att.filename}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({Math.round(att.fileSize / 1024)} KB)</span>
                      <button 
                        type="button" 
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
              <Paperclip className="h-3.5 w-3.5 text-slate-500" />
              Attach File
              <input type="file" multiple onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSending ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
                {isSending ? 'Dispatching...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
