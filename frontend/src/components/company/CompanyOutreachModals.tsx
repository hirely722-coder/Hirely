import React, { useState, useEffect } from 'react';
import { X, Mail, Sparkles, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { Company } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface CompanyOutreachModalsProps {
  showEmailModal: boolean;
  setShowEmailModal: React.Dispatch<React.SetStateAction<boolean>>;
  composerEmailTo: string;
  setComposerEmailTo: (val: string) => void;
  composerEmailSubject: string;
  setComposerEmailSubject: (val: string) => void;
  composerEmailBody: string;
  setComposerEmailBody: (val: string) => void;
  selectedCompanyTemplateId: string;
  setSelectedCompanyTemplateId: (val: string) => void;
  company: Company;
  primaryContact: any;
  handleSendEmail: (e: React.FormEvent) => void;
  showWhatsAppModal: boolean;
  setShowWhatsAppModal: React.Dispatch<React.SetStateAction<boolean>>;
  composerWATo: string;
  setComposerWATo: (val: string) => void;
  composerWABody: string;
  setComposerWABody: (val: string) => void;
  handleSendWhatsApp: (e: React.FormEvent) => void;
}

export function CompanyOutreachModals({
  showEmailModal,
  setShowEmailModal,
  composerEmailTo,
  setComposerEmailTo,
  composerEmailSubject,
  setComposerEmailSubject,
  composerEmailBody,
  setComposerEmailBody,
  selectedCompanyTemplateId,
  setSelectedCompanyTemplateId,
  company,
  primaryContact,
  handleSendEmail,
  showWhatsAppModal,
  setShowWhatsAppModal,
  composerWATo,
  setComposerWATo,
  composerWABody,
  setComposerWABody,
  handleSendWhatsApp
}: CompanyOutreachModalsProps) {
  const [emailOpen, setEmailOpen] = useState(showEmailModal);
  const [waOpen, setWaOpen] = useState(showWhatsAppModal);

  useEffect(() => {
    setEmailOpen(showEmailModal);
  }, [showEmailModal]);

  useEffect(() => {
    setWaOpen(showWhatsAppModal);
  }, [showWhatsAppModal]);

  const handleCloseEmail = () => {
    setEmailOpen(false);
    setTimeout(() => setShowEmailModal(false), 200);
  };

  const handleCloseWhatsApp = () => {
    setWaOpen(false);
    setTimeout(() => setShowWhatsAppModal(false), 200);
  };

  return (
    <>
      {/* EMAIL COMPOSE MODAL */}
      <AnimatedModal isOpen={emailOpen} onClose={handleCloseEmail}>
        {(animate) => (
          <div 
            className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-200 transform flex flex-col max-h-[90vh] ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSendEmail} className="flex flex-col h-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h4 className="text-xs font-bold text-slate-900 font-sans uppercase flex items-center gap-1.5">
                  <Mail className="h-4.5 w-4.5 text-slate-505" />
                  Dispatch Client Email
                </h4>
                <button type="button" onClick={handleCloseEmail} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Quick Template Picker */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Select Outreach Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'custom',
                        name: '✏️ Custom (Blank)',
                        subject: `Hirly - Recruitment Partnership Update - ${company.name}`,
                        body: `Hi ${primaryContact.name || 'Team'},\n\nI hope this email finds you well.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment Partner`
                      },
                      {
                        id: 'sourcing_update',
                        name: '⏱️ Sourcing Update',
                        subject: `Hirly - Sourcing Pipeline Update for ${company.name}`,
                        body: `Hi ${primaryContact.name || 'Team'},\n\nI hope your week is going well.\n\nI wanted to share a quick update regarding our sourcing pipeline for your active positions at ${company.name}. We've got several high-potential prospects undergoing final assessments.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment Partner`
                      },
                      {
                        id: 'shortlist_presentation',
                        name: '💼 Shortlist CVs',
                        subject: `Hirly - Selected Candidate Shortlist for ${company.name}`,
                        body: `Hi ${primaryContact.name || 'Team'},\n\nWe have completed our initial screening round and compiled a highly selective shortlist of premium candidates matching your active requirements.\n\nI've attached their vetted CVs and match details. Please let us know who you would like to advance to interviews.\n\nWarmly,\nSarah Jenkins\nHirly Recruitment Partner`
                      },
                      {
                        id: 'schedule_sync',
                        name: '📅 Schedule Sync',
                        subject: `Hirly - Quick Check-in Sync for ${company.name}`,
                        body: `Hi ${primaryContact.name || 'Team'},\n\nWould you be available for a brief 10-minute check-in sync this week to align on your hiring timeline and ongoing active roles?\n\nLooking forward to speaking with you.\n\nBest,\nSarah Jenkins\nHirly Recruitment Partner`
                      }
                    ].map(tmpl => {
                      const isSelected = selectedCompanyTemplateId === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            setSelectedCompanyTemplateId(tmpl.id);
                            setComposerEmailSubject(tmpl.subject);
                            setComposerEmailBody(tmpl.body);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold truncate">{tmpl.name}</div>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5 font-sans">Quick select style</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">To Contact Email</label>
                  <input 
                    type="email" 
                    required 
                    value={composerEmailTo} 
                    onChange={(e) => setComposerEmailTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Subject Line</label>
                  <input 
                    type="text" 
                    required 
                    value={composerEmailSubject} 
                    onChange={(e) => setComposerEmailSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Email Body Draft</label>
                  <textarea 
                    rows={8} 
                    required 
                    value={composerEmailBody} 
                    onChange={(e) => setComposerEmailBody(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-900 text-slate-100 font-sans"
                  />
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Email channel verified
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCloseEmail} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                    <Send className="h-3.5 w-3.5" />
                    Send Email
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </AnimatedModal>

      {/* WHATSAPP COMPOSE MODAL */}
      <AnimatedModal isOpen={waOpen} onClose={handleCloseWhatsApp}>
        {(animate) => (
          <div 
            className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-200 transform flex flex-col ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSendWhatsApp}>
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h4 className="text-xs font-bold text-slate-900 font-sans uppercase flex items-center gap-1.5">
                  <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
                  Dispatch WhatsApp Alert
                </h4>
                <button type="button" onClick={handleCloseWhatsApp} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Recipient Mobile</label>
                  <input 
                    type="text" 
                    required 
                    value={composerWATo} 
                    onChange={(e) => setComposerWATo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">WhatsApp message text</label>
                  <textarea 
                    rows={4} 
                    required 
                    value={composerWABody} 
                    onChange={(e) => setComposerWABody(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-slate-900 text-slate-100 font-sans"
                  />
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  SMS Router active
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCloseWhatsApp} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                    <Send className="h-3.5 w-3.5" />
                    Send message
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </AnimatedModal>
    </>
  );
}
