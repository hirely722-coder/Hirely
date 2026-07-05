import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowRight, Sparkles, Calendar, Mail, Phone, Share2, Trash2, Copy, Search 
} from 'lucide-react';
import { Job, Company, Candidate, EmailTemplate, JobCandidate } from '../../types';
import { useJobDetailsState } from './useJobDetailsState';
import { computeCandidateMatchData } from './jobMatchHelpers';
import { JobOverviewTab } from './JobOverviewTab';
import { JobAiMatchingTab } from './JobAiMatchingTab';
import { JobCandidatesTab } from './JobCandidatesTab';
import { JobPipelineTab } from './JobPipelineTab';
import { JobInterviewsTab } from './JobInterviewsTab';
import { JobLogsTab } from './JobLogsTab';
import { JobNotesModal } from './JobNotesModal';
import { JobInterviewModal } from './JobInterviewModal';
import { JobOutreachModals } from './JobOutreachModals';
import { CandidateDetailsModal } from './CandidateDetailsModal';
import { JobBudgetTab } from './JobBudgetTab';

interface JobDetailsPageProps {
  job: Job;
  companies: Company[];
  candidates: Candidate[];
  onBack: () => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onUpdateCandidateStage: (candidateId: string, newStage: Candidate['status']) => void;
}

type TabType = 'overview' | 'ai-matching' | 'candidates' | 'pipeline' | 'interviews' | 'budget' | 'notes' | 'communication' | 'activity';

export default function JobDetailsPage(props: JobDetailsPageProps) {
  const { job, candidates, onBack } = props;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [jobCandidates, setJobCandidates] = useState<JobCandidate[]>([]);
  const [jobCandidatesLoading, setJobCandidatesLoading] = useState(false);

  const fetchJobCandidates = useCallback(async () => {
    setJobCandidatesLoading(true);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/job-candidates/${job.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setJobCandidates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch job candidates:', err);
    } finally {
      setJobCandidatesLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    fetchJobCandidates();
  }, [fetchJobCandidates]);

  const handleUpdateJobCandidateStage = useCallback(async (candidateId: string, stage: string) => {
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/job-candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ jobId: job.id, candidateId, stage }),
      });
      if (res.ok) {
        await fetchJobCandidates();
      }
    } catch (err) {
      console.error('Failed to update job candidate stage:', err);
    }
  }, [job.id, fetchJobCandidates]);

  // Instantiate our custom state hook
  const state = useJobDetailsState({
    ...props,
    jobCandidates,
    onUpdateJobCandidateStage: handleUpdateJobCandidateStage
  });

  // Compute matched candidates list (memoized)
  const candidateMatchData = useMemo(() => {
    return computeCandidateMatchData(candidates, job);
  }, [candidates, job]);

  // ToastNotifier inside workspace
  const toastElement = state.toastMessage && (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 z-50 animate-slide-up border border-slate-800">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-sans font-medium">{state.toastMessage}</span>
    </div>
  );

  // Advanced search helpers matching tab contents
  const filteredNotes = useMemo(() => {
    return state.notes.filter(n => 
      n.text.toLowerCase().includes(state.detailSearch.toLowerCase()) ||
      n.author.toLowerCase().includes(state.detailSearch.toLowerCase())
    );
  }, [state.notes, state.detailSearch]);

  const filteredInterviews = useMemo(() => {
    return state.interviews.filter(i => 
      i.candidateName.toLowerCase().includes(state.detailSearch.toLowerCase()) ||
      i.round.toLowerCase().includes(state.detailSearch.toLowerCase()) ||
      i.interviewer.toLowerCase().includes(state.detailSearch.toLowerCase())
    );
  }, [state.interviews, state.detailSearch]);

  const filteredCommunications = useMemo(() => {
    return state.communications.filter(c => 
      c.candidateName.toLowerCase().includes(state.detailSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(state.detailSearch.toLowerCase()) ||
      c.message.toLowerCase().includes(state.detailSearch.toLowerCase())
    );
  }, [state.communications, state.detailSearch]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => 
      c.name.toLowerCase().includes(state.detailSearch.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(state.detailSearch.toLowerCase())) ||
      c.currentCompany.toLowerCase().includes(state.detailSearch.toLowerCase())
    );
  }, [candidates, state.detailSearch]);

  const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
      id: 't1',
      name: 'Initial outreach request',
      category: 'Outreach',
      subject: `Exploring Opportunities: ${job.title} opening at ${job.companyName}`,
      body: `Dear [Candidate],\n\nI hope this email finds you well. I came across your impressive professional background and wanted to see if you might be interested in exploring a ${job.title} opportunity at ${job.companyName}.\n\nLet me know your availability for a brief call.\n\nBest,\nSarah Jenkins`,
      lastUpdated: '2026-06-25',
      variables: ['Candidate']
    },
    {
      id: 't2',
      name: 'Interview calendar setup',
      category: 'Scheduling',
      subject: `Interview Invitation: ${job.title} - ${job.companyName}`,
      body: `Hi [Candidate],\n\nWe are excited to advance your application to the technical round. Please select a suitable slot from our recruiter link or reply with your preferred days next week.\n\nBest,\nSarah Jenkins`,
      lastUpdated: '2026-06-24',
      variables: ['Candidate']
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in" id="job-details-workspace">
      {toastElement}

      {/* Header back & action button line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button 
            onClick={onBack}
            className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-950 font-medium transition-colors mb-2 cursor-pointer"
          >
            <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back to Jobs
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">{job.title}</h1>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${
              job.status === 'Open' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {job.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Partner Client: <strong className="text-slate-700">{job.companyName}</strong> • {job.location} • Created: 2026-06-24
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={state.handleToggleJobStatus}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors cursor-pointer"
          >
            {job.status === 'Open' ? 'Close Position' : 'Reopen Position'}
          </button>
          <button 
            onClick={state.handleDuplicateJob}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button 
            onClick={state.handleShareJob}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Post
          </button>
          <button 
            onClick={state.handleDeleteJobClick}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-600 border border-rose-200 bg-rose-50/30 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Main workspace layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Tab content area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none bg-slate-50/50 p-1 rounded-xl border">
            {(['overview', 'ai-matching', 'candidates', 'pipeline', 'interviews', 'budget', 'notes', 'communication', 'activity'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-bold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search across ${activeTab.replace('-', ' ')} logs, candidates, or comments...`}
              value={state.detailSearch}
              onChange={(e) => state.setDetailSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white shadow-xs"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-96">
            {activeTab === 'overview' && (
              <JobOverviewTab
                job={job}
                executeAiTool={state.executeAiTool}
                isAiProcessing={state.isAiProcessing}
                aiFeatureResult={state.aiFeatureResult}
                setShowAiReportModal={state.setShowAiReportModal}
                triggerToast={state.triggerToast}
              />
            )}

            {activeTab === 'ai-matching' && (
              <JobAiMatchingTab
                job={job}
                detailSearch={state.detailSearch}
                candidateMatchData={candidateMatchData}
                selectedCandidateIds={state.selectedCandidateIds}
                setSelectedCandidateIds={state.setSelectedCandidateIds}
                isScanning={state.isScanning}
                triggerScan={state.triggerScan}
                toggleSelectCandidate={state.toggleSelectCandidate}
                toggleSelectAll={state.toggleSelectAll}
                handleBulkEmail={state.handleBulkEmail}
                handleBulkShortlist={state.handleBulkShortlist}
                handleBulkPipeline={state.handleBulkPipeline}
                handleBulkExport={state.handleBulkExport}
                setViewedCandidate={state.setViewedCandidate}
                setShowCandidateModal={state.setShowCandidateModal}
                setEmailCandidate={state.setEmailCandidate}
                setEmailSubject={state.setEmailSubject}
                setEmailBody={state.setEmailBody}
                setShowEmailModal={state.setShowEmailModal}
                setWhatsAppCandidate={state.setWhatsAppCandidate}
                setWhatsAppMessage={state.setWhatsAppMessage}
                setShowWhatsAppModal={state.setShowWhatsAppModal}
                onUpdateCandidateStage={props.onUpdateCandidateStage}
                triggerToast={state.triggerToast}
                setInterviewCandidate={state.setInterviewCandidate}
                setInterviewDate={state.setInterviewDate}
                setInterviewTime={state.setInterviewTime}
                setShowInterviewModal={state.setShowInterviewModal}
                onRefreshCandidates={fetchJobCandidates}
              />
            )}

            {activeTab === 'candidates' && (
              <JobCandidatesTab
                job={job}
                jobCandidates={jobCandidates}
                isLoading={jobCandidatesLoading}
                onRefresh={fetchJobCandidates}
                allCandidates={candidates}
                setViewedCandidate={state.setViewedCandidate}
                setShowCandidateModal={state.setShowCandidateModal}
                setEmailCandidate={state.setEmailCandidate}
                setEmailSubject={state.setEmailSubject}
                setEmailBody={state.setEmailBody}
                setShowEmailModal={state.setShowEmailModal}
                setWhatsAppCandidate={state.setWhatsAppCandidate}
                setWhatsAppMessage={state.setWhatsAppMessage}
                setShowWhatsAppModal={state.setShowWhatsAppModal}
                triggerToast={state.triggerToast}
                logActivity={state.logActivity}
              />
            )}

            {activeTab === 'pipeline' && (
              <JobPipelineTab
                jobCandidates={jobCandidates}
                handleDragStart={state.handleDragStart}
                handleDragOver={state.handleDragOver}
                handleDrop={state.handleDrop}
              />
            )}

            {activeTab === 'interviews' && (
              <JobInterviewsTab
                candidates={candidates}
                filteredInterviews={filteredInterviews}
                setInterviewCandidate={state.setInterviewCandidate}
                setInterviewDate={state.setInterviewDate}
                setInterviewTime={state.setInterviewTime}
                setShowInterviewModal={state.setShowInterviewModal}
                handleUpdateInterviewStatus={state.handleUpdateInterviewStatus}
                generateMeetingLink={state.generateMeetingLink}
              />
            )}

            {activeTab === 'budget' && (
              <JobBudgetTab
                job={job}
                jobCandidates={jobCandidates}
                onRefresh={fetchJobCandidates}
                triggerToast={state.triggerToast}
              />
            )}

            {['notes', 'communication', 'activity'].includes(activeTab) && (
              <JobLogsTab
                activeTab={activeTab as any}
                candidates={candidates}
                filteredNotes={filteredNotes}
                filteredCommunications={filteredCommunications}
                activities={state.activities}
                emailTemplates={EMAIL_TEMPLATES}
                setEditingNote={state.setEditingNote}
                setNoteText={state.setNoteText}
                setShowNoteModal={state.setShowNoteModal}
                handleEditNoteStart={state.handleEditNoteStart}
                handleDeleteNote={state.handleDeleteNote}
                handleApplyTemplate={state.handleApplyTemplate}
              />
            )}
          </div>
        </div>

        {/* Sidebar tools */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-4 border border-slate-800">
            <h3 className="text-xs font-bold tracking-wide text-slate-300 uppercase font-mono">Smart Quick Tools</h3>
            <div className="flex flex-col gap-2 text-xs">
              <button 
                onClick={state.triggerScan}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800 cursor-pointer"
              >
                <span>Find Matches</span>
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              </button>
              <button 
                onClick={() => {
                  state.setInterviewCandidate(candidates[0] || null);
                  state.setShowInterviewModal(true);
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800 cursor-pointer"
              >
                <span>Schedule Interview</span>
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={() => {
                  if (candidates[0]) {
                    state.setEmailCandidate(candidates[0]);
                    state.setEmailSubject(`Next steps - ${job.title}`);
                    state.setEmailBody(`Hi,\n\nI wanted to check your availability...`);
                    state.setShowEmailModal(true);
                  } else {
                    state.triggerToast('No candidates to email.');
                  }
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800 cursor-pointer"
              >
                <span>Email Candidate Pool</span>
                <Mail className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={() => {
                  if (candidates[0]) {
                    state.setWhatsAppCandidate(candidates[0]);
                    state.setWhatsAppMessage('Hi, are you open to discussing the Senior React role?');
                    state.setShowWhatsAppModal(true);
                  } else {
                    state.triggerToast('No candidates to WhatsApp.');
                  }
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800 cursor-pointer"
              >
                <span>WhatsApp Candidates</span>
                <Phone className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={state.handleShareJob}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800 cursor-pointer"
              >
                <span>Share Job Posting</span>
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={() => state.executeAiTool('shortlist')}
                className="w-full text-left py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors flex items-center justify-between rounded-lg cursor-pointer"
              >
                <span>Generate AI Shortlist</span>
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals bindings */}
      <JobNotesModal
        isOpen={state.showNoteModal}
        onClose={() => state.setShowNoteModal(false)}
        editingNote={state.editingNote}
        noteText={state.noteText}
        setNoteText={state.setNoteText}
        handleSaveNote={state.handleSaveNote}
      />

      <JobInterviewModal
        isOpen={state.showInterviewModal}
        onClose={() => state.setShowInterviewModal(false)}
        candidates={candidates}
        interviewCandidate={state.interviewCandidate}
        setInterviewCandidate={state.setInterviewCandidate}
        interviewDate={state.interviewDate}
        setInterviewDate={state.setInterviewDate}
        interviewTime={state.interviewTime}
        setInterviewTime={state.setInterviewTime}
        interviewerName={state.interviewerName}
        setInterviewerName={state.setInterviewerName}
        interviewRound={state.interviewRound}
        setInterviewRound={state.setInterviewRound}
        handleScheduleSubmit={state.handleScheduleSubmit}
      />

      <JobOutreachModals
        job={job}
        showEmailModal={state.showEmailModal}
        setShowEmailModal={state.setShowEmailModal}
        emailCandidate={state.emailCandidate}
        setEmailCandidate={state.setEmailCandidate}
        emailSubject={state.emailSubject}
        setEmailSubject={state.setEmailSubject}
        emailBody={state.emailBody}
        setEmailBody={state.setEmailBody}
        selectedJobTemplateId={state.selectedJobTemplateId}
        setSelectedJobTemplateId={state.setSelectedJobTemplateId}
        handleSendEmailSubmit={state.handleSendEmailSubmit}
        showWhatsAppModal={state.showWhatsAppModal}
        setShowWhatsAppModal={state.setShowWhatsAppModal}
        whatsAppCandidate={state.whatsAppCandidate}
        setWhatsAppCandidate={state.setWhatsAppCandidate}
        whatsAppMessage={state.whatsAppMessage}
        setWhatsAppMessage={state.setWhatsAppMessage}
        handleSendWhatsAppSubmit={state.handleSendWhatsAppSubmit}
        showAiReportModal={state.showAiReportModal}
        setShowAiReportModal={state.setShowAiReportModal}
        aiFeatureResult={state.aiFeatureResult}
        triggerToast={state.triggerToast}
      />

      <CandidateDetailsModal
        isOpen={state.showCandidateModal}
        onClose={() => state.setShowCandidateModal(false)}
        job={job}
        viewedCandidate={state.viewedCandidate}
        onUpdateCandidateStage={props.onUpdateCandidateStage}
        triggerToast={state.triggerToast}
        setInterviewCandidate={state.setInterviewCandidate}
        setInterviewDate={state.setInterviewDate}
        setInterviewTime={state.setInterviewTime}
        setShowInterviewModal={state.setShowInterviewModal}
        setEmailCandidate={state.setEmailCandidate}
        setEmailSubject={state.setEmailSubject}
        setEmailBody={state.setEmailBody}
        setShowEmailModal={state.setShowEmailModal}
        setWhatsAppCandidate={state.setWhatsAppCandidate}
        setWhatsAppMessage={state.setWhatsAppMessage}
        setShowWhatsAppModal={state.setShowWhatsAppModal}
      />
    </div>
  );
}
