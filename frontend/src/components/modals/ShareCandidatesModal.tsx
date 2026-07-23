import React, { useState, useEffect } from 'react';
import { X, Mail, ShieldCheck, FileText, Eye, CheckCircle2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Candidate, Company, Job, CustomTheme } from '../../types';
import { generateWcPdf, GeneratedPdfResult } from '../../utils/wcPdfGenerator';
import AnimatedModal from '../AnimatedModal';
import Portal from '../Portal';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../utils/supabase';

interface ShareCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCandidates: Candidate[];
  companies: Company[];
  jobs: Job[];
  activeTheme: CustomTheme;
  showToast: (text: string, type: 'success' | 'error') => void;
  onSuccess?: () => void;
  onNavigateToSettings?: (tab?: string) => void;
}

export function ShareCandidatesModal({
  isOpen,
  onClose,
  selectedCandidates,
  companies,
  jobs,
  activeTheme,
  showToast,
  onSuccess,
  onNavigateToSettings
}: ShareCandidatesModalProps) {
  const { token } = useApp();
  const [open, setOpen] = useState(isOpen);
  const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [wcEnabled, setWcEnabled] = useState<boolean>(true);
  const [isWcMandatory, setIsWcMandatory] = useState<boolean>(false);
  const [isWcModuleActive, setIsWcModuleActive] = useState<boolean>(true);
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<GeneratedPdfResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showEmailIntegrationPrompt, setShowEmailIntegrationPrompt] = useState<boolean>(false);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    if (isOpen) {
      // Read global WC module settings from Settings Modules tab
      const storedWcEnabled = localStorage.getItem('hirely_module_wc_enabled');
      const storedWcPolicy = localStorage.getItem('hirely_module_wc_policy');

      const isModuleOn = storedWcEnabled !== 'false';
      const isMandatory = storedWcPolicy === 'mandatory';

      setIsWcModuleActive(isModuleOn);
      setIsWcMandatory(isMandatory);

      if (isMandatory) {
        setWcEnabled(true);
      } else {
        setWcEnabled(isModuleOn);
      }

      setCandidatesList(selectedCandidates);
      
      const defaultFilename = selectedCandidates.length === 1
        ? `Candidate_Presentation_${selectedCandidates[0].name.replace(/\s+/g, '_')}.pdf`
        : `Candidate_Presentation_Package_${selectedCandidates.length}_Profiles.pdf`;
      setPdfFilename(defaultFilename);

      if (companies.length > 0) {
        const firstCo = companies[0];
        setSelectedCompanyId(firstCo.id);
        setRecipientEmail(firstCo.email || '');
      }
      setSubject(`Candidate Presentation (${selectedCandidates.length}) - Confidential Profile Summaries`);
      setNotes(`Dear Team,\n\nPlease find attached the profile summaries for the candidates short-listed for your review.\n\nBest regards,\nRecruitment Team`);

      // Sync live email integration status from backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || '';
      supabase.auth.getSession().then(({ data: { session } }) => {
        const authToken = session?.access_token || '';
        fetch(`${backendUrl}/api/email-integration`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        })
          .then(res => res.json())
          .then(data => {
            if (data.providers?.gmail?.isConnected) {
              localStorage.setItem('hirely_oauth_active', 'true');
            }
          })
          .catch(() => {});
      });
    }
  }, [isOpen, selectedCandidates, companies]);

  const handleCompanyChange = (coId: string) => {
    setSelectedCompanyId(coId);
    const co = companies.find(c => c.id === coId);
    if (co) {
      setRecipientEmail(co.email || '');
      if (co.name) {
        setSubject(`Candidate Presentation for ${co.name} - Confidential Profile Summaries`);
      }
    }
  };

  const handleGeneratePreview = async () => {
    if (candidatesList.length === 0) {
      showToast('Please select at least one candidate', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedCo = companies.find(c => c.id === selectedCompanyId);
      const selectedJob = jobs.find(j => j.id === selectedJobId);

      const pdfRes = await generateWcPdf({
        candidates: candidatesList,
        wcEnabled,
        branding: {
          logoUrl: activeTheme.branding.logoUrl,
          agencyName: activeTheme.name !== 'Default' ? activeTheme.name : 'Hirely Agency Network'
        },
        jobTitle: selectedJob?.title,
        companyName: selectedCo?.name
      });

      setPreviewResult(pdfRes);
      setShowPreviewModal(true);
    } catch (err: any) {
      console.error('PDF preview error:', err);
      showToast('Failed to generate PDF preview: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      showToast('Please specify a valid recipient email', 'error');
      return;
    }
    if (candidatesList.length === 0) {
      showToast('Please select at least one candidate profile', 'error');
      return;
    }

    setIsSending(true);
    try {
      const selectedCo = companies.find(c => c.id === selectedCompanyId);
      const selectedJob = jobs.find(j => j.id === selectedJobId);

      const pdfRes = await generateWcPdf({
        candidates: candidatesList,
        wcEnabled,
        branding: {
          logoUrl: activeTheme.branding.logoUrl,
          agencyName: activeTheme.name !== 'Default' ? activeTheme.name : 'Hirely Agency Network'
        },
        jobTitle: selectedJob?.title,
        companyName: selectedCo?.name
      });

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || '';
      const endpoint = `${backendUrl}/api/email-integration/send-candidates`;
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || '';

      const finalPdfFilename = (pdfFilename.trim() || pdfRes.filename).toLowerCase().endsWith('.pdf')
        ? (pdfFilename.trim() || pdfRes.filename)
        : `${(pdfFilename.trim() || pdfRes.filename)}.pdf`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          recipientEmail,
          subject,
          notes,
          wcEnabled,
          pdfBase64: pdfRes.base64,
          pdfFilename: finalPdfFilename,
          companyName: selectedCo?.name,
          candidateNames: candidatesList.map(c => c.name)
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = (errJson.error || errJson.message || '').toLowerCase();
        if (errJson.code === 'NO_ACTIVE_EMAIL_INTEGRATION' || errMsg.includes('smtp') || errMsg.includes('email integration') || errMsg.includes('connect')) {
          setIsSending(false);
          setShowEmailIntegrationPrompt(true);
          return;
        }
        throw new Error(errJson.error || errJson.message || 'Failed to dispatch email');
      }

      showToast(`✓ Successfully sent ${candidatesList.length} candidate profile(s) to ${recipientEmail}!`, 'success');
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('[ShareCandidatesModal] Email dispatch error:', err);
      showToast(`❌ Failed to dispatch email: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const removeCandidate = (id: string) => {
    setCandidatesList(prev => prev.filter(c => c.id !== id));
  };

  const applyShortlistTemplate = () => {
    const comp = companies.find(c => c.id === selectedCompanyId)?.name || 'Hiring Team';
    const candNames = candidatesList.map(c => c.name).join(', ');
    setNotes(`Dear ${comp} Team,\n\nPlease find attached the confidential profile summaries for our top shortlisted candidates (${candNames}) for your review.\n\nKey Highlights:\n- All candidate profiles have been thoroughly vetted and formatted according to our agency quality standards.\n- Contact information has been white-labeled for candidate privacy compliance.\n\nPlease let us know your preferred interview availability.\n\nBest regards,\nRecruitment Team`);
  };

  const applyExecutiveSummaryTemplate = () => {
    const comp = companies.find(c => c.id === selectedCompanyId)?.name || 'Hiring Team';
    setNotes(`Executive Presentation - Shortlisted Candidates\nTarget Client: ${comp}\nTotal Profiles: ${candidatesList.length}\n\nOverview:\nOur sourcing team has completed preliminary technical evaluations and compiled the attached candidate package. Each profile summary includes detailed technical skills, relevant industry experience, and background highlights.\n\nNext Steps:\nKindly review the attached PDF package and confirm which candidates you wish to advance to initial interview rounds.\n\nBest regards,\nSenior Talent Acquisition Team`);
  };

  const hasCustomLogo = Boolean(activeTheme.branding.logoUrl);

  return (
    <AnimatedModal isOpen={open} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/30 border border-blue-400/30 rounded-xl">
                <Mail className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-sans flex items-center gap-2">
                  Share Candidates via Email (WC Presentation Studio) 
                  {wcEnabled && (
                    <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] rounded-md font-mono font-bold">
                      WC MODE ACTIVE
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">Compose customized candidate presentation packages directly for client companies.</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 2-Column Main Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            
            {/* LEFT PANEL: 40% Width - Client & Candidate Context */}
            <div className="lg:col-span-5 p-5 space-y-4 overflow-y-auto bg-slate-50/50 text-xs text-slate-700">
              
              {/* Section 1: Client Company & Job */}
              <div className="space-y-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Target Client Company & Context
                </h4>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Client Company</label>
                    <select 
                      value={selectedCompanyId}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Choose Company --</option>
                      {companies.map(co => (
                        <option key={co.id} value={co.id}>{co.name} ({co.contactPerson || 'No contact'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Recipient Email</label>
                    <input 
                      type="email" 
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. hr@clientcompany.com"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Associated Job Opening (Optional)</label>
                    <select 
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- General Submission --</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title} ({j.companyName})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: White-Label Privacy Settings */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-slate-900 text-xs">WC Mode (Contact Redaction)</h5>
                        {isWcMandatory && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-[8px] rounded font-bold font-mono">
                            🔒 MANDATORY
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">Strips phone, email & addresses from PDF profiles.</p>
                    </div>
                  </div>
                  <label className={`relative inline-flex items-center ${isWcMandatory ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                    <input 
                      type="checkbox" 
                      checked={wcEnabled} 
                      disabled={isWcMandatory}
                      onChange={(e) => !isWcMandatory && setWcEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-700">Watermark:</span>
                  {hasCustomLogo ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                      Custom Logo Enabled
                    </span>
                  ) : (
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                      Standard Agency Header Active
                    </span>
                  )}
                </div>
              </div>

              {/* Section 3: Selected Candidates List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">
                    Selected Profiles ({candidatesList.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={isGenerating || candidatesList.length === 0}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 text-blue-400" />}
                    Preview PDF
                  </button>
                </div>

                {candidatesList.length === 0 ? (
                  <div className="p-3 bg-white border border-dashed border-slate-300 rounded-xl text-center text-slate-500 text-xs">
                    No candidates selected.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {candidatesList.map(cand => (
                      <div key={cand.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {cand.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{cand.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {cand.designation} • {cand.experience || 'Exp N/A'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCandidate(cand.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove candidate"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: 60% Width - Expanded Email Composition Studio */}
            <div className="lg:col-span-7 p-5 flex flex-col justify-between space-y-4 bg-white overflow-y-auto">
              
              {/* Subject Line Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">Email Subject Line</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Candidate Presentation - Confidential Profile Summaries"
                  className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Quick Template Toolbar */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Templates:</span>
                <button
                  type="button"
                  onClick={applyShortlistTemplate}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                >
                  + Shortlist Intro
                </button>
                <button
                  type="button"
                  onClick={applyExecutiveSummaryTemplate}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition-colors cursor-pointer"
                >
                  + Executive Summary
                </button>
              </div>

              {/* Expanded Email Cover Note Text Area (Full Height Studio Editor) */}
              <div className="flex-1 flex flex-col space-y-1.5 min-h-[280px]">
                <label className="block text-[11px] font-bold text-slate-700">Email Cover Note (Expanded Editor)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write customized presentation notes for the client hiring manager..."
                  className="w-full flex-1 p-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-700 whitespace-nowrap">PDF Attachment Name:</span>
              <input 
                type="text"
                value={pdfFilename}
                onChange={(e) => setPdfFilename(e.target.value)}
                placeholder="e.g. Candidate_Presentation.pdf"
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none w-72 shadow-2xs"
              />
            </div>
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
                onClick={handleSendEmail}
                disabled={isSending || candidatesList.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Mail className="h-4 w-4 text-white" />
                )}
                {isSending ? 'Dispatching Email...' : 'Send Resumes to Company'}
              </button>
            </div>
          </div>

          {/* Embedded PDF Live Preview Modal */}
          {showPreviewModal && previewResult && (
            <Portal>
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4">
                <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-blue-400" />
                      <span className="font-bold text-xs">PDF Preview: {previewResult.filename}</span>
                      {wcEnabled ? (
                        <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                          WC REDACTION ACTIVE
                        </span>
                      ) : (
                        <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                          FULL INFO (NO REDACTION)
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => setShowPreviewModal(false)}
                      className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-slate-100 p-2">
                    <iframe 
                      src={previewResult.blobUrl} 
                      className="w-full h-full rounded-xl border border-slate-300" 
                      title="Candidate PDF Preview"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(false)}
                      className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            </Portal>
          )}

          {/* Email Integration Required Pop-up Dialog */}
          {showEmailIntegrationPrompt && (
            <Portal>
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4">
                <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-slate-800 animate-fade-in">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 shrink-0">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 font-sans">Email Integration Required</h4>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        Please connect your email account or agency SMTP server first to send candidate presentations directly to client companies.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowEmailIntegrationPrompt(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailIntegrationPrompt(false);
                        handleClose();
                        localStorage.setItem('hirely_settings_active_tab', 'email_integration');
                        if (onNavigateToSettings) {
                          onNavigateToSettings('email_integration');
                        } else {
                          window.dispatchEvent(new CustomEvent('hirly:navigate_settings', { detail: { tab: 'email_integration' } }));
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      Go to Email Settings
                    </button>
                  </div>
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}
    </AnimatedModal>
  );
}
