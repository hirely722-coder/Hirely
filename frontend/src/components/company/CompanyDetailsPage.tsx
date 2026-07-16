import React, { useMemo, useState } from 'react';
import CompanyFormModal from './CompanyFormModal';
import { useApp } from '../../context/AppContext';
import { 
  ChevronLeft, Building2, Globe, Mail, Phone, MapPin, Plus, Edit2, Sparkles, 
  Trash, MessageSquare, Briefcase, Users, FileText, CheckCircle, Clock, 
  BarChart3, Upload, Download, Eye, Send, Search, Check, AlertCircle, Copy, HelpCircle, Star, Info, X, ExternalLink
} from 'lucide-react';
import { Company, Job, Candidate } from '../../types';
import { useCompanyState } from './useCompanyState';
import { 
  filterJobsBySearch, 
  filterCandidatesBySearch, 
  filterContactsBySearch, 
  filterNotesBySearch, 
  filterDocumentsBySearch, 
  filterCommunicationsBySearch 
} from './companyHelpers';

import { CompanyOverviewTab } from './CompanyOverviewTab';
import { CompanyJobsTab } from './CompanyJobsTab';
import { CompanyCandidatesTab } from './CompanyCandidatesTab';
import { CompanyContactsTab } from './CompanyContactsTab';
import { CompanyDocumentsTab } from './CompanyDocumentsTab';
import { CompanyNotesTab } from './CompanyNotesTab';
import { CompanyCommunicationsTab } from './CompanyCommunicationsTab';
import { CompanyActivityTab } from './CompanyActivityTab';
import { CompanyAiInsightsTab } from './CompanyAiInsightsTab';

import { CompanyAddContactModal } from './CompanyAddContactModal';
import { CompanyAddJobModal } from './CompanyAddJobModal';
import { CompanyAddNoteModal } from './CompanyAddNoteModal';
import { CompanyUploadDocModal } from './CompanyUploadDocModal';
import { CompanyOutreachModals } from './CompanyOutreachModals';
import SubmitCandidateModal from './SubmitCandidateModal';

interface CompanyDetailsPageProps {
  company: Company;
  onBack: () => void;
  jobs: Job[];
  candidates: Candidate[];
  onEditCompany: (company: Company) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onAddJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onComposeEmail?: (candidate: Candidate) => void;
  onComposeWhatsApp?: (candidate: Candidate) => void;
}

export default function CompanyDetailsPage(props: CompanyDetailsPageProps) {
  const { 
    company, 
    onBack, 
    jobs, 
    candidates, 
    onEditCompany, 
    onEditCandidate, 
    onAddJob, 
    onEditJob, 
    onDeleteJob, 
    onComposeEmail, 
    onComposeWhatsApp 
  } = props;

  const state = useCompanyState({
    company,
    jobs,
    candidates,
    onEditCompany,
    onEditCandidate,
    onAddJob,
    onEditJob,
    onDeleteJob,
    onComposeEmail,
    onComposeWhatsApp
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { teamMembers } = useApp();

  // Pure helper workspace search filters
  const filteredJobs = useMemo(() => {
    return filterJobsBySearch(state.companyJobs, state.workspaceSearch);
  }, [state.companyJobs, state.workspaceSearch]);

  const filteredCandidates = useMemo(() => {
    return filterCandidatesBySearch(state.companyCandidates, state.workspaceSearch);
  }, [state.companyCandidates, state.workspaceSearch]);

  const filteredContacts = useMemo(() => {
    return filterContactsBySearch(state.contacts, state.workspaceSearch);
  }, [state.contacts, state.workspaceSearch]);

  const filteredNotes = useMemo(() => {
    return filterNotesBySearch(state.notes, state.workspaceSearch);
  }, [state.notes, state.workspaceSearch]);

  const filteredDocuments = useMemo(() => {
    return filterDocumentsBySearch(state.documents, state.workspaceSearch);
  }, [state.documents, state.workspaceSearch]);

  const filteredCommunications = useMemo(() => {
    return filterCommunicationsBySearch(state.communications, state.workspaceSearch);
  }, [state.communications, state.workspaceSearch]);

  return (
    <div className="space-y-6 animate-fade-in" id="company-details-workspace">
      
      {/* Local Toast Toastbox */}
      {state.toast && (
        <div className="fixed top-5 right-5 z-60 bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-up text-xs font-semibold">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{state.toast.text}</span>
        </div>
      )}

      {/* Back to Client Registry & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors font-sans cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Companies
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-400 font-mono">Workspace</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold font-sans">{company.name}</span>
      </div>

      {/* Client Meta Hero Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-xl text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-500/10 font-sans">
            {company.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-950 font-sans tracking-tight">{company.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                company.status === 'Active' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {company.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1 font-sans">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{company.website?.replace('https://', '')}</a>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1 font-sans">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {company.address || 'N/A'}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1 font-sans">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                Account: <strong className="font-bold text-slate-700">{company.recContact || 'Sarah Jenkins'}</strong>
              </span>
              {company.linkedinUrl && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1 font-sans">
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all font-sans cursor-pointer bg-white"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit Profile
        </button>
      </div>

      {/* QUICK ACTIONS BAR - ALWAYS VISIBLE */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1.5">Quick Actions</span>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => state.setShowAddJobModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Add Job
          </button>
          
          <button 
            onClick={() => state.setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Submit Candidate
          </button>

          <button 
            onClick={() => state.triggerEmailCompany()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            Email HR
          </button>

          <button 
            onClick={() => state.triggerWhatsAppCompany()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-xs cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
            WhatsApp HR
          </button>

          <button 
            onClick={() => state.setShowAddContactModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Add Contact
          </button>

          <button 
            onClick={() => state.setShowUploadDocModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            Upload Doc
          </button>

          <button 
            onClick={() => state.setShowAddNoteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Create Note
          </button>
        </div>
      </div>

      {/* SEARCH AND TAB NAVIGATION CONTROLS */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-slate-200 pb-1.5">
        <div className="relative w-full xl:w-80 order-2 xl:order-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs, candidates, logs..."
            value={state.workspaceSearch}
            onChange={(e) => state.setWorkspaceSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-xs font-sans"
          />
        </div>

        <div className="flex flex-wrap gap-1 order-1 xl:order-2">
          {(['overview', 'jobs', 'candidates', 'contacts', 'documents', 'notes', 'communication', 'activity', 'ai_insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => state.setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                state.activeTab === tab 
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* WORKSPACE TAB CONTENT PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm min-h-96">
        
        {state.activeTab === 'overview' && (
          <CompanyOverviewTab
            company={company}
            companyJobs={state.companyJobs}
            companyCandidates={state.companyCandidates}
            primaryContact={state.primaryContact}
            communications={state.communications}
            triggerEmailCompany={state.triggerEmailCompany}
            triggerWhatsAppCompany={state.triggerWhatsAppCompany}
          />
        )}

        {state.activeTab === 'jobs' && (
          <CompanyJobsTab
            filteredJobs={filteredJobs}
            setShowAddJobModal={state.setShowAddJobModal}
            onEditJob={onEditJob}
            onAddJob={onAddJob}
            onDeleteJob={onDeleteJob}
            showLocalToast={state.showLocalToast}
          />
        )}

        {state.activeTab === 'candidates' && (
          <CompanyCandidatesTab
            company={company}
            candidates={candidates}
            filteredCandidates={filteredCandidates}
            selectedCandidateIds={state.selectedCandidateIds}
            setSelectedCandidateIds={state.setSelectedCandidateIds}
            setShowSubmitModal={state.setShowSubmitModal}
            onEditCandidate={onEditCandidate}
            addActivity={state.addActivity}
            showLocalToast={state.showLocalToast}
            triggerEmailCompany={state.triggerEmailCompany}
            triggerWhatsAppCompany={state.triggerWhatsAppCompany}
          />
        )}

        {state.activeTab === 'contacts' && (
          <CompanyContactsTab
            filteredContacts={filteredContacts}
            setShowAddContactModal={state.setShowAddContactModal}
            setContacts={state.setContacts}
            triggerEmailCompany={state.triggerEmailCompany}
            triggerWhatsAppCompany={state.triggerWhatsAppCompany}
            showLocalToast={state.showLocalToast}
          />
        )}

        {state.activeTab === 'documents' && (
          <CompanyDocumentsTab
            filteredDocuments={filteredDocuments}
            setDocuments={state.setDocuments}
            setShowUploadDocModal={state.setShowUploadDocModal}
            dragActive={state.dragActive}
            handleDrag={state.handleDrag}
            handleDrop={state.handleDrop}
            handleManualUpload={state.handleManualUpload}
            showLocalToast={state.showLocalToast}
          />
        )}

        {state.activeTab === 'notes' && (
          <CompanyNotesTab
            filteredNotes={filteredNotes}
            showAddNoteModal={state.showAddNoteModal}
            setShowAddNoteModal={state.setShowAddNoteModal}
            newNoteContent={state.newNoteContent}
            setNewNoteContent={state.setNewNoteContent}
            handleAddNoteSubmit={state.handleAddNoteSubmit}
          />
        )}

        {state.activeTab === 'communication' && (
          <CompanyCommunicationsTab
            filteredCommunications={filteredCommunications}
            setComposerEmailTo={state.setComposerEmailTo}
            setComposerEmailSubject={state.setComposerEmailSubject}
            setComposerEmailBody={state.setComposerEmailBody}
            setShowEmailModal={state.setShowEmailModal}
            setComposerWATo={state.setComposerWATo}
            setComposerWABody={state.setComposerWABody}
            setShowWhatsAppModal={state.setShowWhatsAppModal}
            showLocalToast={state.showLocalToast}
          />
        )}

        {state.activeTab === 'activity' && (
          <CompanyActivityTab
            activities={state.activities}
          />
        )}

        {state.activeTab === 'ai_insights' && (
          <CompanyAiInsightsTab
            company={company}
            setShowSubmitModal={state.setShowSubmitModal}
            setNotes={state.setNotes}
            showLocalToast={state.showLocalToast}
          />
        )}

      </div>

      {/* --- MODALS BLOCK --- */}

      <SubmitCandidateModal 
        isOpen={state.showSubmitModal}
        onClose={() => state.setShowSubmitModal(false)}
        company={company}
        jobs={jobs}
        candidates={candidates}
        onEditCandidate={onEditCandidate}
        primaryContactEmail={state.primaryContact.email}
        onRecordSubmission={state.handleFinishSubmission}
      />

      <CompanyAddContactModal
        isOpen={state.showAddContactModal}
        onClose={() => state.setShowAddContactModal(false)}
        newContactName={state.newContactName}
        setNewContactName={state.setNewContactName}
        newContactEmail={state.newContactEmail}
        setNewContactEmail={state.setNewContactEmail}
        newContactPhone={state.newContactPhone}
        setNewContactPhone={state.setNewContactPhone}
        newContactRole={state.newContactRole}
        setNewContactRole={state.setNewContactRole}
        newContactDept={state.newContactDept}
        setNewContactDept={state.setNewContactDept}
        newContactIsPrimary={state.newContactIsPrimary}
        setNewContactIsPrimary={state.setNewContactIsPrimary}
        handleAddContactSubmit={state.handleAddContactSubmit}
      />

      <CompanyAddJobModal
        isOpen={state.showAddJobModal}
        onClose={() => state.setShowAddJobModal(false)}
        newJobTitle={state.newJobTitle}
        setNewJobTitle={state.setNewJobTitle}
        newJobLocation={state.newJobLocation}
        setNewJobLocation={state.setNewJobLocation}
        newJobExp={state.newJobExp}
        setNewJobExp={state.setNewJobExp}
        newJobSalary={state.newJobSalary}
        setNewJobSalary={state.setNewJobSalary}
        newJobDesc={state.newJobDesc}
        setNewJobDesc={state.setNewJobDesc}
        newJobSkills={state.newJobSkills}
        setNewJobSkills={state.setNewJobSkills}
        handleAddJobSubmit={state.handleAddJobSubmit}
      />

      <CompanyAddNoteModal
        isOpen={state.showAddNoteModal}
        onClose={() => state.setShowAddNoteModal(false)}
        newNoteContent={state.newNoteContent}
        setNewNoteContent={state.setNewNoteContent}
        handleAddNoteSubmit={state.handleAddNoteSubmit}
      />

      <CompanyUploadDocModal
        isOpen={state.showUploadDocModal}
        onClose={() => state.setShowUploadDocModal(false)}
        dragActive={state.dragActive}
        handleDrag={state.handleDrag}
        handleDrop={state.handleDrop}
        handleManualUpload={state.handleManualUpload}
      />

      <CompanyOutreachModals
        showEmailModal={state.showEmailModal}
        setShowEmailModal={state.setShowEmailModal}
        composerEmailTo={state.composerEmailTo}
        setComposerEmailTo={state.setComposerEmailTo}
        composerEmailSubject={state.composerEmailSubject}
        setComposerEmailSubject={state.setComposerEmailSubject}
        composerEmailBody={state.composerEmailBody}
        setComposerEmailBody={state.setComposerEmailBody}
        selectedCompanyTemplateId={state.selectedCompanyTemplateId}
        setSelectedCompanyTemplateId={state.setSelectedCompanyTemplateId}
        company={company}
        primaryContact={state.primaryContact}
        handleSendEmail={state.handleSendEmail}
        showWhatsAppModal={state.showWhatsAppModal}
        setShowWhatsAppModal={state.setShowWhatsAppModal}
        composerWATo={state.composerWATo}
        setComposerWATo={state.setComposerWATo}
        composerWABody={state.composerWABody}
        setComposerWABody={state.setComposerWABody}
        handleSendWhatsApp={state.handleSendWhatsApp}
      />

      <CompanyFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={async (updated) => {
          await onEditCompany(updated);
          setIsEditModalOpen(false);
          state.showLocalToast('✓ Company profile updated successfully!', 'success');
        }}
        company={company}
        teamMembers={teamMembers}
      />

    </div>
  );
}
