import React from 'react';
import { Copy } from 'lucide-react';
import { CommunicationLog } from '../../utils/companyMockData';

interface CompanyCommunicationsTabProps {
  filteredCommunications: CommunicationLog[];
  setComposerEmailTo: (val: string) => void;
  setComposerEmailSubject: (val: string) => void;
  setComposerEmailBody: (val: string) => void;
  setShowEmailModal: React.Dispatch<React.SetStateAction<boolean>>;
  setComposerWATo: (val: string) => void;
  setComposerWABody: (val: string) => void;
  setShowWhatsAppModal: React.Dispatch<React.SetStateAction<boolean>>;
  showLocalToast: (text: string, type: 'success' | 'error') => void;
}

export function CompanyCommunicationsTab({
  filteredCommunications,
  setComposerEmailTo,
  setComposerEmailSubject,
  setComposerEmailBody,
  setShowEmailModal,
  setComposerWATo,
  setComposerWABody,
  setShowWhatsAppModal,
  showLocalToast
}: CompanyCommunicationsTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-slate-900 font-sans">Communication Outbox History</h3>
      
      <div className="space-y-3.5">
        {filteredCommunications.length === 0 ? (
          <p className="text-slate-400 text-xs italic pl-1">No communication history logged.</p>
        ) : (
          filteredCommunications.map(comm => (
            <div key={comm.id} className="p-4 border border-slate-200 rounded-xl bg-white flex items-start justify-between gap-4 shadow-2xs">
              <div className="flex gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] uppercase font-sans border ${
                  comm.type === 'Email' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  comm.type === 'WhatsApp' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {comm.type.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs font-sans">{comm.subject || `${comm.type} Message`}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    To: <strong className="font-semibold text-slate-600 font-sans">{comm.recipient}</strong> • Sent by {comm.sentBy}
                  </p>
                  {comm.body && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-2 font-mono whitespace-pre-wrap leading-normal">
                      {comm.body}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end justify-between h-full text-right gap-4 shrink-0">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  comm.status === 'Sent' || comm.status === 'Delivered' || comm.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {comm.status}
                </span>
                
                <button 
                  onClick={() => {
                    if (comm.type === 'Email') {
                      setComposerEmailTo(comm.recipient);
                      setComposerEmailSubject(comm.subject);
                      setComposerEmailBody(comm.body || '');
                      setShowEmailModal(true);
                    } else {
                      setComposerWATo(comm.recipient);
                      setComposerWABody(comm.body || '');
                      setShowWhatsAppModal(true);
                    }
                    showLocalToast('✓ Loaded previous template inside dispatch draft!', 'success');
                  }}
                  className="flex items-center gap-1 px-2 py-1 border border-slate-200 text-[10px] text-slate-600 rounded-md hover:border-blue-500 hover:text-blue-600 font-mono cursor-pointer bg-white shadow-2xs font-semibold"
                >
                  <Copy className="h-3 w-3" />
                  Reuse Template
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
