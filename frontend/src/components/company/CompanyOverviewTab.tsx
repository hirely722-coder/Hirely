import React from 'react';
import { Info, Users, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import { Company, Job, Candidate, CommunicationLog } from '../../types';

interface CompanyOverviewTabProps {
  company: Company;
  companyJobs: Job[];
  companyCandidates: Candidate[];
  primaryContact: any;
  communications: CommunicationLog[];
  triggerEmailCompany: (email: string, name: string) => void;
  triggerWhatsAppCompany: (phone: string, name: string) => void;
}

export function CompanyOverviewTab({
  company,
  companyJobs,
  companyCandidates,
  primaryContact,
  communications,
  triggerEmailCompany,
  triggerWhatsAppCompany
}: CompanyOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        {/* Highlight metrics bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl shadow-2xs">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Open Jobs</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">
              {companyJobs.filter(j => j.status === 'Open').length}
            </span>
          </div>
          <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl shadow-2xs">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Active Candidates</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">
              {companyCandidates.length}
            </span>
          </div>
          <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl shadow-2xs">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Interviews</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block">3</span>
          </div>
          <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl shadow-2xs">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Placements</span>
            <span className="text-xl font-extrabold text-slate-900 mt-1 block text-emerald-600">1</span>
          </div>
        </div>

        {/* Company Details Metadata Panel */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Info className="h-4.5 w-4.5 text-blue-500" />
            Partnership Dossier
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">Industry Focus</span>
              <p className="font-semibold text-slate-800">{company.industry || 'Financial Technology & Enterprise SaaS'}</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">Company Size</span>
              <p className="font-semibold text-slate-800">
                {company.companySize ? `${company.companySize} employees` : '500 - 1000 employees'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">Founded Year</span>
              <p className="font-semibold text-slate-800">{company.foundedYear || '2015'}</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">Partnership Tier</span>
              <p className="font-semibold text-slate-800">{company.tier || 'Tier 3 (Standard)'}</p>
            </div>
            {company.linkedInUrl && (
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">LinkedIn Profile</span>
                <p className="font-semibold text-slate-800">
                  <a href={company.linkedInUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    {company.linkedInUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            )}
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">Primary Contact Person</span>
              <p className="font-semibold text-slate-800">{primaryContact.name} ({primaryContact.designation})</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase block font-bold">Registered Address</span>
              <p className="font-semibold text-slate-800">{company.address || 'HQ: San Francisco, California'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account manager partner sidecard */}
      <div className="lg:col-span-1 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">PRIMARY CONTACT</h4>
        
        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-2xs">
          <div>
            <p className="font-bold text-slate-900 text-xs">{primaryContact.name}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{primaryContact.designation}</p>
            <p className="text-[10px] text-blue-600 font-mono mt-1.5">{primaryContact.email}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => triggerEmailCompany(primaryContact.email, primaryContact.name)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
              title="Send Email"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button 
              onClick={() => triggerWhatsAppCompany(primaryContact.phone, primaryContact.name)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded cursor-pointer"
              title="Send WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Small Recent Communication feed */}
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">RECENT INTERACTIONS</p>
          <div className="space-y-2 text-[11px] text-slate-600">
            {communications.slice(0, 2).map(comm => (
              <div key={comm.id} className="flex gap-2 items-start p-1.5 bg-white border border-slate-100 rounded-lg shadow-2xs">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                  comm.type === 'Email' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {comm.type}
                </span>
                <div>
                  <p className="font-semibold text-slate-800 leading-tight">{comm.subject}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">{comm.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
