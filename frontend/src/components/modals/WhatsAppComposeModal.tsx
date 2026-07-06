import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Sparkles, Plus, Phone, CheckCheck, HelpCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { Candidate, Job, CommunicationLog } from '../../types';
import AnimatedModal from '../AnimatedModal';

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
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200);
  };

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

  const buildTemplate = (type: string, jobObj?: Job) => {
    if (type === 'custom') return;
    
    let text = '';
    const name = candidate.name;
    const compName = jobObj ? jobObj.companyName : (candidate.currentCompany || companyName || 'your company');

    switch (type) {
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

  useEffect(() => {
    buildTemplate(activeTemplate, currentJob);
  }, [candidate, companyName, selectedJobId, activeTemplate, recipientAudience]);

  const hasPhone = candidate.phone && candidate.phone.replace(/\D/g, '').length >= 7;

  const handleSend = () => {
    if (!hasPhone) {
      showToast('❌ Failed: Candidate phone number is invalid or missing!', 'error');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      const cleanPhone = candidate.phone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(message);
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const waUrl = isMobile 
        ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
        : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      
      window.open(waUrl, '_blank');

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
      handleClose();
    }, 1000);
  };

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
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">Compose WhatsApp Message</h3>
                <p className="text-[10px] text-slate-500 font-mono">Recipient Client: WhatsApp Web & App Link</p>
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
            <div className="space-y-4 font-sans">
              {!hasPhone ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2.5 text-rose-800 animate-pulse">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-rose-900 font-sans">Missing Phone Number</p>
                    <p className="text-[10px] text-rose-705 mt-0.5 leading-relaxed font-sans">
                      This candidate does not have a valid telephone number listed ("{candidate.phone || 'None'}"). Please configure a phone number to enable messaging.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex gap-3 text-slate-700">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0 mt-0.5 font-sans">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 font-sans">Delivery Recipient</p>
                    <p className="text-[10px] text-slate-505 font-mono mt-0.5">
                      {candidate.name} • {candidate.phone}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Select Active Job Position</label>
                <select 
                  value={selectedJobId} 
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    setActiveTemplate('pitch');
                  }}
                  className="w-full h-[36px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="" className="text-slate-400">-- None (Generic Profile Chat) --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id} className="text-slate-800">{j.title} ({j.companyName})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-mono text-slate-550 uppercase tracking-wider font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-600" /> WhatsApp Outreach Templates
                  </label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientAudience('Candidate');
                        setActiveTemplate('pitch');
                      }}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${recipientAudience === 'Candidate' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-550 hover:text-slate-800'}`}
                    >
                      👤 Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientAudience('Company');
                        setActiveTemplate('partnership');
                      }}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer transition-all ${recipientAudience === 'Company' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-550 hover:text-slate-800'}`}
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
                            ? 'border-emerald-505 bg-emerald-50 text-emerald-700 shadow-xs ring-1 ring-emerald-500/20 font-semibold'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate">{t.label}</div>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate leading-tight font-sans">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {recipientAudience === 'Company' && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2 animate-fade-in shadow-2xs">
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
                        <div className="p-2 bg-white rounded-lg border border-emerald-100 text-[10px] space-y-0.5 text-slate-600 shadow-2xs">
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
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer transition-all flex items-center gap-1 shadow-xs font-sans select-none"
                          >
                            <Plus className="h-3 w-3" /> Full Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMessage(prev => prev + ' ' + targetCand.name);
                              showToast(`✓ Inserted name: ${targetCand.name}`, 'success');
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer transition-all font-sans select-none"
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
                            className="px-2.5 py-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 cursor-pointer transition-all font-sans select-none"
                          >
                            Skills
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">
                  Insert Job Details & Extras
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleInsertJobDetails}
                    disabled={!currentJob}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all font-sans"
                    title="Insert basic job parameters (title, location, salary)"
                  >
                    <Plus className="h-3 w-3 text-emerald-600" /> Job Details
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertSkills}
                    disabled={!currentJob}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all font-sans"
                    title="Insert required skills bullet list"
                  >
                    <Plus className="h-3 w-3 text-emerald-600" /> Required Skills
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertCalendly}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all font-sans"
                    title="Insert quick Calendly scheduling URL"
                  >
                    <Plus className="h-3 w-3 text-emerald-600" /> Calendly Link
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertPerks}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all font-sans"
                    title="Insert list of standard benefits"
                  >
                    <Plus className="h-3 w-3 text-emerald-600" /> Work Perks
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertSignature}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-all font-sans"
                    title="Insert professional signature sign-off"
                  >
                    <Plus className="h-3 w-3 text-emerald-600" /> Signature
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                  Custom Extra Snippet (Write & append)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Interviewing this Thursday afternoon..."
                    value={customExtraText}
                    onChange={(e) => setCustomExtraText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-[11px] border border-slate-200 bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleInsertCustomExtra}
                    className="px-3 py-1.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg cursor-pointer flex items-center gap-1 shrink-0 font-sans select-none"
                  >
                    <Plus className="h-3 w-3" /> Append
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                    WhatsApp Message Draft
                  </label>
                  <span className="text-[9px] text-slate-404 font-mono font-semibold">
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
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 bg-white text-slate-850 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-sans leading-relaxed resize-none disabled:bg-slate-50 disabled:cursor-not-allowed font-medium"
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
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-150 font-bold">
                  Official WA Formatting
                </span>
              </div>

              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-inner relative max-h-[500px] min-h-[380px]">
                <div className="px-4 py-2.5 bg-emerald-705 text-white flex items-center justify-between shrink-0 font-sans" style={{ backgroundColor: '#075e54' }}>
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

                <div 
                  className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3"
                  style={{
                    backgroundColor: '#efeae2',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.4'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7z'/%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  <div className="self-center bg-[#d1e4fc]/90 shadow-2xs rounded-lg px-2.5 py-1 text-[9px] text-slate-655 uppercase tracking-wider font-semibold font-sans">
                    Today
                  </div>

                  <div className="self-start bg-white text-slate-800 rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-xs text-[11px] leading-relaxed relative font-sans">
                    Hi Sarah, I saw your recruitment agency profile on Hirly. What positions are active now?
                    <span className="absolute top-0 -left-1 text-white text-xs">◀</span>
                    <div className="text-right text-[8px] text-slate-400 mt-1 font-mono">10:41 AM</div>
                  </div>

                  <div className="self-end bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-none p-3.5 max-w-[85%] shadow-xs text-[11.5px] leading-relaxed relative font-sans">
                    <span className="absolute top-0 -right-1.5 text-[#d9fdd3] text-sm">▶</span>
                    {message ? (
                      <div className="whitespace-pre-wrap select-text">
                        {message.split('\n').map((line, idx) => {
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
                    <div className="flex justify-end items-center gap-1 text-[8px] text-slate-500 mt-1.5 font-mono">
                      <span>Just Now</span>
                      <CheckCheck className="h-3 w-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                <div className="px-3 py-2 bg-[#f0f2f5] flex items-center gap-2 border-t shrink-0 font-sans">
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

          <div className="p-4 border-t border-slate-150 flex items-center justify-between bg-slate-50 shrink-0 font-sans">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-550">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Clicking launch will open your browser's WhatsApp client securely.</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleSend}
                disabled={isSending || !hasPhone}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10 transition-colors flex items-center gap-1.5 cursor-pointer select-none"
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
      )}
    </AnimatedModal>
  );
}
