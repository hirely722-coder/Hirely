import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import Portal from '../Portal';
import { Company } from '../../types';

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (company: Company) => Promise<void>;
  company?: Company | null;
  teamMembers: any[];
}

export default function CompanyFormModal({
  isOpen,
  onClose,
  onSubmit,
  company,
  teamMembers
}: CompanyFormModalProps) {
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formStatus, setFormStatus] = useState<Company['status']>('Active');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRecContact, setFormRecContact] = useState('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formCompanySize, setFormCompanySize] = useState<Company['companySize']>('11-50');
  const [formFoundedYear, setFormFoundedYear] = useState('');
  const [formTier, setFormTier] = useState<Company['tier']>('Tier 3');
  const [formLinkedInUrl, setFormLinkedInUrl] = useState('');

  // Load draft or initial company properties
  useEffect(() => {
    if (company) {
      setFormName(company.name);
      setFormContact(company.contactPerson);
      setFormStatus(company.status);
      setFormEmail(company.email);
      setFormPhone(company.phone || '');
      setFormWebsite(company.website || '');
      setFormAddress(company.address || '');
      setFormNotes(company.notes || '');
      setFormRecContact(company.recContact || '');
      setFormIndustry(company.industry || '');
      setFormCompanySize(company.companySize || '11-50');
      setFormFoundedYear(company.foundedYear || '');
      setFormTier(company.tier || 'Tier 3');
      setFormLinkedInUrl(company.linkedinUrl || '');
    } else {
      const rawDraft = localStorage.getItem('hirely_company_form_draft');
      if (rawDraft && isOpen) {
        try {
          const draft = JSON.parse(rawDraft);
          setFormName(draft.name || '');
          setFormContact(draft.contactPerson || '');
          setFormStatus(draft.status || 'Active');
          setFormEmail(draft.email || '');
          setFormPhone(draft.phone || '');
          setFormWebsite(draft.website || '');
          setFormAddress(draft.address || '');
          setFormNotes(draft.notes || '');
          setFormRecContact(draft.recContact || '');
          setFormIndustry(draft.industry || '');
          setFormCompanySize(draft.companySize || '11-50');
          setFormFoundedYear(draft.foundedYear || '');
          setFormTier(draft.tier || 'Tier 3');
          setFormLinkedInUrl(draft.linkedinUrl || '');
          return;
        } catch (e) {
          console.error('Failed to parse company form draft', e);
        }
      }
      setFormName('');
      setFormContact('');
      setFormStatus('Active');
      setFormEmail('');
      setFormPhone('');
      setFormWebsite('');
      setFormAddress('');
      setFormNotes('');
      setFormRecContact('');
      setFormIndustry('');
      setFormCompanySize('11-50');
      setFormFoundedYear('');
      setFormTier('Tier 3');
      setFormLinkedInUrl('');
    }
  }, [company, isOpen]);

  // Save creation draft to localStorage when states change
  useEffect(() => {
    if (!company && isOpen) {
      const draft = {
        name: formName,
        contactPerson: formContact,
        status: formStatus,
        email: formEmail,
        phone: formPhone,
        website: formWebsite,
        address: formAddress,
        notes: formNotes,
        recContact: formRecContact,
        industry: formIndustry,
        companySize: formCompanySize,
        foundedYear: formFoundedYear,
        tier: formTier,
        linkedinUrl: formLinkedInUrl
      };
      localStorage.setItem('hirely_company_form_draft', JSON.stringify(draft));
    }
  }, [
    company, isOpen, formName, formContact, formStatus, formEmail, formPhone,
    formWebsite, formAddress, formNotes, formRecContact, formIndustry,
    formCompanySize, formFoundedYear, formTier, formLinkedInUrl
  ]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formContact) return;

    const payload: Company = {
      id: company?.id || 'c_' + Date.now(),
      name: formName,
      contactPerson: formContact,
      openJobs: company?.openJobs || 0,
      status: formStatus,
      email: formEmail,
      phone: formPhone,
      website: formWebsite,
      address: formAddress,
      notes: formNotes,
      recContact: formRecContact,
      industry: formIndustry,
      companySize: formCompanySize,
      foundedYear: formFoundedYear,
      tier: formTier,
      linkedinUrl: formLinkedInUrl
    };

    await onSubmit(payload);
    localStorage.removeItem('hirely_company_form_draft');
  };

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up text-slate-700">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
            <h2 className="text-xs font-bold text-slate-950 font-sans uppercase flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-500" />
              {company ? `Edit Registry: ${company.name}` : 'Add Corporate Partner'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e: any) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                >
                  <option value="Active">Active Partner</option>
                  <option value="Inactive">Inactive Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Billing Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Website URL</label>
                <input
                  type="text"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">HQ Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="HQ Address"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Industry</label>
                <input
                  type="text"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  placeholder="E.g., SaaS, Fintech, AI"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Size</label>
                <select
                  value={formCompanySize}
                  onChange={(e: any) => setFormCompanySize(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Founded Year</label>
                <input
                  type="text"
                  value={formFoundedYear}
                  onChange={(e) => setFormFoundedYear(e.target.value)}
                  placeholder="E.g., 2018"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Partnership Tier</label>
                <select
                  value={formTier}
                  onChange={(e: any) => setFormTier(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                >
                  <option value="Tier 1">Tier 1 (Key Account)</option>
                  <option value="Tier 2">Tier 2 (Mid Market)</option>
                  <option value="Tier 3">Tier 3 (Standard)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">LinkedIn Page URL</label>
                <input
                  type="text"
                  value={formLinkedInUrl}
                  onChange={(e) => setFormLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Assigned Recruiter</label>
                <select
                  value={formRecContact}
                  onChange={(e) => setFormRecContact(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                >
                  <option value="">Select Recruiter...</option>
                  {teamMembers.map((tm: any) => (
                    <option key={tm.id} value={tm.name}>{tm.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Internal Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Recruitment strategies, fee structures, workload arrangements..."
                  rows={3}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
              >
                {company ? 'Save Changes' : 'Add Partner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
