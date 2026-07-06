import React from 'react';
import { Plus, Mail, Phone, MessageSquare, Trash } from 'lucide-react';
import { Contact } from '../../utils/companyMockData';

interface CompanyContactsTabProps {
  filteredContacts: Contact[];
  setShowAddContactModal: React.Dispatch<React.SetStateAction<boolean>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  triggerEmailCompany: (email: string, name: string) => void;
  triggerWhatsAppCompany: (phone: string, name: string) => void;
  showLocalToast: (text: string, type: 'success' | 'error') => void;
}

export function CompanyContactsTab({
  filteredContacts,
  setShowAddContactModal,
  setContacts,
  triggerEmailCompany,
  triggerWhatsAppCompany,
  showLocalToast
}: CompanyContactsTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 font-sans">Corporate Stakeholders & Contacts</h3>
        <button 
          onClick={() => setShowAddContactModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(con => (
          <div key={con.id} className="p-4 border border-slate-200 rounded-2xl bg-white relative hover:shadow-sm transition-all flex flex-col justify-between min-h-40 shadow-2xs">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-sans">
                    {con.name}
                    {con.isPrimary && (
                      <span className="px-1.5 py-0.25 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">{con.designation}</p>
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider font-bold">{con.department}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-[11px] text-slate-600">
                <p className="flex items-center gap-1.5 font-mono">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {con.email}
                </p>
                <p className="flex items-center gap-1.5 font-mono">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {con.phone}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => triggerEmailCompany(con.email, con.name)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded cursor-pointer"
                  title="Email Contact"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => triggerWhatsAppCompany(con.phone, con.name)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded cursor-pointer"
                  title="WhatsApp Contact"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>

              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    setContacts(prev => prev.map(c => c.id === con.id ? { ...c, isPrimary: true } : { ...c, isPrimary: false }));
                    showLocalToast(`✓ Set ${con.name} as primary contact.`, 'success');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 border border-slate-200 rounded text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer shadow-2xs font-semibold"
                >
                  Set Primary
                </button>
                <button 
                  onClick={() => {
                    setContacts(prev => prev.filter(c => c.id !== con.id));
                    showLocalToast(`Removed contact ${con.name}`, 'error');
                  }}
                  className="p-1 text-slate-400 hover:text-red-650 rounded cursor-pointer"
                  title="Delete Contact"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
