import React, { useState, useMemo } from 'react';
import { Upload, Plus, Mail } from 'lucide-react';
import { Candidate, CommunicationLog, EmailConfig, Job, Task } from '../types';
import { useApp } from '../context/AppContext';
import { useCandidatesState } from './useCandidatesState';
import { CandidatesListView } from './CandidatesListView';
import { CandidateDetailsView } from './CandidateDetailsView';
import { CandidateFormModal } from './CandidateFormModal';
import { BulkUploadModal } from './BulkUploadModal';
import { ShareCandidatesModal } from './modals/ShareCandidatesModal';
import { usePermission } from '../hooks/usePermission';
import { ExportCsvButton } from './ui/ExportCsvButton';
import { ExportColumn } from '../utils/csvExporter';
import { 
  extractUniqueDesignations, 
  extractUniqueCities, 
  extractUniqueGenders,
  extractUniqueSalaries,
  extractUniqueEducations,
  extractUniqueExperiences,
  filterAndSortCandidates, 
  computeMatchedJobsForCandidate 
} from './candidatesHelpers';

interface CandidatesViewProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Candidate) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (id: string) => void;
  openResumeUploadOnLoad?: boolean;
  communicationLogs: CommunicationLog[];
  onAddCommunicationLog: (log: CommunicationLog) => void;
  emailConfig: EmailConfig;
  jobs: Job[];
  onAddTask: (task: Task) => void;
  setNotifications: React.Dispatch<React.SetStateAction<{ id: string; text: string; time: string; read: boolean }[]>>;
  showToast: (text: string, type: 'success' | 'error') => void;
  triggerAutoTask: (candidate: Candidate, triggerType: 'email_sent' | 'whatsapp_sent' | 'interview_scheduled' | 'candidate_selected' | 'followup_added') => void;
  onComposeEmail: (candidate: Candidate, preselectedJob?: Job) => void;
  onComposeWhatsApp: (candidate: Candidate, preselectedJob?: Job) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onAddTaskForCandidate: (candidate: Candidate) => void;
  onOpenCSVImport?: (type: 'companies' | 'jobs' | 'candidates') => void;
  isLoading?: boolean;
}

export default function CandidatesView(props: CandidatesViewProps) {
  const { 
    candidates, 
    onAddCandidate, 
    onEditCandidate, 
    onDeleteCandidate, 
    openResumeUploadOnLoad = false,
    communicationLogs = [],
    onAddCommunicationLog,
    jobs,
    showToast,
    triggerAutoTask,
    onComposeEmail,
    onComposeWhatsApp,
    onScheduleInterview,
    onAddTaskForCandidate,
    onOpenCSVImport,
    isLoading = false
  } = props;

  const { customFieldDefinitions, companies } = useApp();
  const { can } = usePermission();

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [candidatesToShare, setCandidatesToShare] = useState<Candidate[]>([]);

  const handleOpenShareModal = (cands: Candidate[]) => {
    setCandidatesToShare(cands);
    setIsShareModalOpen(true);
  };

  const candidatesExportColumns = useMemo<ExportColumn<Candidate>[]>(() => {
    const baseCols: ExportColumn<Candidate>[] = [
      { header: 'Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Experience', key: 'experience' },
      { header: 'Designation', key: 'designation', transform: (val) => val || 'N/A' },
      { header: 'Current Company', key: 'currentCompany' },
      { header: 'Pipeline Stage', key: 'status' },
      { header: 'AI Match Score', key: 'aiMatchScore', transform: (val) => val || 85 },
      { header: 'Education', key: 'education' },
      { header: 'City', key: 'city', transform: (val) => val || 'N/A' },
      { header: 'Gender', key: 'gender', transform: (val) => val || 'N/A' },
      { header: 'Expected Salary', key: 'expectedSalary', transform: (val) => val || 'N/A' },
      { header: 'Notice Period', key: 'noticePeriod', transform: (val) => val || 'N/A' },
      { header: 'Applied Date', key: 'appliedDate' },
      { header: 'Notes', key: 'notes' }
    ];

    if (customFieldDefinitions && customFieldDefinitions.length > 0) {
      customFieldDefinitions.forEach((def: any) => {
        baseCols.push({
          header: def.name,
          key: `cf_${def.key}`,
          transform: (_, record) => {
            const val = record.customFields?.[def.key];
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            return String(val);
          }
        });
      });
    }

    return baseCols;
  }, [customFieldDefinitions]);

  // Wrapped actions with permission checks
  const handleCSVImport = () => {
    if (!can('candidates.import')) {
      showToast('❌ Access Denied: You do not have permission to import candidate databases.', 'error');
      return;
    }
    onOpenCSVImport?.('candidates');
  };

  const handleImportResume = () => {
    if (!can('candidates.upload_resume')) {
      showToast('❌ Access Denied: You do not have permission to upload resumes.', 'error');
      return;
    }
    state.resetForm();
    state.setShowUploadModal(true);
  };

  const handleAddCandidate = () => {
    if (!can('candidates.add')) {
      showToast('❌ Access Denied: You do not have permission to add candidates.', 'error');
      return;
    }
    state.startAddManually();
  };

  const handleStartEdit = (candidate: Candidate) => {
    if (!can('candidates.edit')) {
      showToast('❌ Access Denied: You do not have permission to edit candidates.', 'error');
      return;
    }
    state.startEdit(candidate);
  };

  const handleDeleteCandidateWithPermission = (id: string) => {
    if (!can('candidates.delete')) {
      showToast('❌ Access Denied: You do not have permission to delete candidates.', 'error');
      return;
    }
    onDeleteCandidate(id);
  };

  const handleEditCandidateWithPermission = (candidate: Candidate) => {
    if (!can('candidates.edit')) {
      showToast('❌ Access Denied: You do not have permission to edit candidates.', 'error');
      return;
    }
    onEditCandidate(candidate);
  };

  // Instantiate candidate state custom hook
  const state = useCandidatesState({
    candidates,
    onAddCandidate,
    onEditCandidate: handleEditCandidateWithPermission,
    onDeleteCandidate: handleDeleteCandidateWithPermission,
    openResumeUploadOnLoad,
    onAddCommunicationLog,
    showToast,
    triggerAutoTask
  });

  // Calculate unique filters from candidates pool
  const designationsList = useMemo(() => {
    return extractUniqueDesignations(candidates);
  }, [candidates]);

  const citiesList = useMemo(() => {
    return extractUniqueCities(candidates);
  }, [candidates]);

  const gendersList = useMemo(() => {
    return extractUniqueGenders(candidates);
  }, [candidates]);

  const salariesList = useMemo(() => {
    return extractUniqueSalaries(candidates);
  }, [candidates]);

  const educationsList = useMemo(() => {
    return extractUniqueEducations(candidates);
  }, [candidates]);

  const experiencesList = useMemo(() => {
    return extractUniqueExperiences(candidates);
  }, [candidates]);

  // Compute filtered & sorted candidate profiles
  const filteredCandidates = useMemo(() => {
    return filterAndSortCandidates({
      candidates,
      searchTerm: state.debouncedSearchTerm,
      statusFilter: state.statusFilter,
      designationFilter: state.designationFilter,
      genderFilter: state.genderFilter,
      cityFilter: state.cityFilter,
      salaryFilter: state.salaryFilter,
      educationFilter: state.educationFilter,
      experienceFilter: state.experienceFilter,
      scoreFilter: state.scoreFilter,
      skillsCountFilter: state.skillsCountFilter,
      resumeAttachedFilter: state.resumeAttachedFilter,
      customFieldFilters: state.customFieldFilters,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder
    });
  }, [
    candidates,
    state.debouncedSearchTerm,
    state.statusFilter,
    state.designationFilter,
    state.genderFilter,
    state.cityFilter,
    state.salaryFilter,
    state.educationFilter,
    state.experienceFilter,
    state.scoreFilter,
    state.skillsCountFilter,
    state.resumeAttachedFilter,
    state.customFieldFilters,
    state.sortBy,
    state.sortOrder
  ]);

  const paginatedCandidates = useMemo(() => {
    const startIdx = (state.currentPage - 1) * state.itemsPerPage;
    return filteredCandidates.slice(startIdx, startIdx + state.itemsPerPage);
  }, [filteredCandidates, state.currentPage, state.itemsPerPage]);

  const totalPages = Math.ceil(filteredCandidates.length / state.itemsPerPage) || 1;

  // Rank job matching scores for selected candidate details view
  const matchedJobs = useMemo(() => {
    if (!state.selectedCandidate) return [];
    return computeMatchedJobsForCandidate(state.selectedCandidate, jobs);
  }, [state.selectedCandidate, jobs]);

  return (
    <div className="space-y-6 animate-fade-in" id="candidates-view">
      {state.selectedCandidate ? (
        /* ==================== CANDIDATE FULL DETAILS VIEW (NEW PAGE VIEW) ==================== */
        <CandidateDetailsView
          selectedCandidate={state.selectedCandidate}
          setSelectedCandidate={state.setSelectedCandidate}
          jobs={jobs}
          matchedJobs={matchedJobs}
          customFieldDefinitions={customFieldDefinitions}
          candidateNotes={state.candidateNotes}
          setCandidateNotes={state.setCandidateNotes}
          handleSaveNotes={state.handleSaveNotes}
          onEditCandidate={handleEditCandidateWithPermission}
          onDeleteCandidate={handleDeleteCandidateWithPermission}
          communicationLogs={communicationLogs}
          onComposeEmail={onComposeEmail}
          onComposeWhatsApp={onComposeWhatsApp}
          onScheduleInterview={onScheduleInterview}
          handleLogCompletedCall={state.handleLogCompletedCall}
          onAddTaskForCandidate={onAddTaskForCandidate}
          showToast={showToast}
          startEdit={handleStartEdit}
        />
      ) : (
        /* ==================== CANDIDATES LIST VIEW (DEFAULT FULL-WIDTH) ==================== */
        <>
          {/* Page Title & primary actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-sans">Candidates</h1>
              <p className="text-sm text-slate-500 mt-1">Review applicant profiles, qualifications, and automated match criteria.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
              {onOpenCSVImport && (
                <button 
                  onClick={handleCSVImport}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-55 transition-colors cursor-pointer bg-white"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  Import CSV/Excel
                </button>
              )}
              
              <button 
                onClick={handleImportResume}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-55 transition-colors cursor-pointer bg-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Resume
              </button>
              
              <ExportCsvButton
                data={filteredCandidates}
                columns={candidatesExportColumns}
                filename="candidates_export"
                permission="candidates.export"
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              />

              <button 
                onClick={handleAddCandidate}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Candidate
              </button>
            </div>
          </div>

          <CandidatesListView
            filteredCandidates={filteredCandidates}
            paginatedCandidates={paginatedCandidates}
            visibleColumns={state.visibleColumns}
            setVisibleColumns={state.setVisibleColumns}
            jobs={jobs}
            showColumnCustomizer={state.showColumnCustomizer}
            setShowColumnCustomizer={state.setShowColumnCustomizer}
            customFieldDefinitions={customFieldDefinitions}
            isLoading={isLoading}
            currentPage={state.currentPage}
            setCurrentPage={state.setCurrentPage}
            totalPages={totalPages}
            itemsPerPage={state.itemsPerPage}
            searchTerm={state.searchTerm}
            setSearchTerm={state.setSearchTerm}
            statusFilter={state.statusFilter}
            setStatusFilter={state.setStatusFilter}
            showFiltersPanel={state.showFiltersPanel}
            setShowFiltersPanel={state.setShowFiltersPanel}
            designationFilter={state.designationFilter}
            setDesignationFilter={state.setDesignationFilter}
            genderFilter={state.genderFilter}
            setGenderFilter={state.setGenderFilter}
            cityFilter={state.cityFilter}
            setCityFilter={state.setCityFilter}
            salaryFilter={state.salaryFilter}
            setSalaryFilter={state.setSalaryFilter}
            educationFilter={state.educationFilter}
            setEducationFilter={state.setEducationFilter}
            experienceFilter={state.experienceFilter}
            setExperienceFilter={state.setExperienceFilter}
            scoreFilter={state.scoreFilter}
            setScoreFilter={state.setScoreFilter}
            skillsCountFilter={state.skillsCountFilter}
            setSkillsCountFilter={state.setSkillsCountFilter}
            resumeAttachedFilter={state.resumeAttachedFilter}
            setResumeAttachedFilter={state.setResumeAttachedFilter}
            customFieldFilters={state.customFieldFilters}
            setCustomFieldFilters={state.setCustomFieldFilters}
            designationsList={designationsList}
            citiesList={citiesList}
            gendersList={gendersList}
            salariesList={salariesList}
            educationsList={educationsList}
            experiencesList={experiencesList}
            handleSort={state.handleSort}
            setSelectedCandidate={state.setSelectedCandidate}
            onComposeEmail={onComposeEmail}
            onComposeWhatsApp={onComposeWhatsApp}
            startEdit={handleStartEdit}
            onDeleteCandidate={handleDeleteCandidateWithPermission}
            showToast={showToast}
            selectedCandidateIds={selectedCandidateIds}
            setSelectedCandidateIds={setSelectedCandidateIds}
            onOpenShareModal={handleOpenShareModal}
          />
        </>
      )}

      {/* Share Candidates with Client Company (WC White-Label PDF) Modal */}
      <ShareCandidatesModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        selectedCandidates={candidatesToShare}
        companies={companies || []}
        jobs={jobs || []}
        activeTheme={{
          id: 'custom',
          name: 'Agency Workspace',
          colors: {} as any,
          typography: {} as any,
          layout: {} as any,
          branding: {
            logoUrl: localStorage.getItem('hirely_logo_url') || undefined
          }
        }}
        showToast={showToast}
        onSuccess={() => setSelectedCandidateIds([])}
      />

      {/* Sub-modals bindings */}
      <BulkUploadModal
        isOpen={state.showUploadModal}
        onClose={() => state.setShowUploadModal(false)}
        reviewItem={state.reviewItem}
        setReviewItem={state.setReviewItem}
        bulkItems={state.bulkItems}
        setBulkItems={state.setBulkItems}
        isParsing={state.isParsing}
        parseError={state.parseError}
        dragActive={state.dragActive}
        parsingStep={state.parsingStep}
        fileInputRef={state.fileInputRef}
        removeBulkItem={state.removeBulkItem}
        handleDrag={state.handleDrag}
        handleDrop={state.handleDrop}
        handleFileChange={state.handleFileChange}
        handleParseBulkResumes={state.handleParseBulkResumes}
        handleImportAllSuccess={state.handleImportAllSuccess}
        handleSaveReviewItem={state.handleSaveReviewItem}
      />

      <CandidateFormModal
        isOpenAdd={state.showAddModal}
        onCloseAdd={() => state.setShowAddModal(false)}
        isOpenEdit={!!state.showEditModal}
        onCloseEdit={() => state.setShowEditModal(null)}
        formName={state.formName}
        setFormName={state.setFormName}
        formEmail={state.formEmail}
        setFormEmail={state.setFormEmail}
        formPhone={state.formPhone}
        setFormPhone={state.setFormPhone}
        formExperience={state.formExperience}
        setFormExperience={state.setFormExperience}
        formCurrentCompany={state.formCurrentCompany}
        setFormCurrentCompany={state.setFormCurrentCompany}
        formDesignation={state.formDesignation}
        setFormDesignation={state.setFormDesignation}
        formSkillsText={state.formSkillsText}
        setFormSkillsText={state.setFormSkillsText}
        formEducation={state.formEducation}
        setFormEducation={state.setFormEducation}
        formAddress={state.formAddress}
        setFormAddress={state.setFormAddress}
        formGender={state.formGender}
        setFormGender={state.setFormGender}
        formCity={state.formCity}
        setFormCity={state.setFormCity}
        formExpectedSalary={state.formExpectedSalary}
        setFormExpectedSalary={state.setFormExpectedSalary}
        formStatus={state.formStatus}
        setFormStatus={state.setFormStatus}
        customFieldDefinitions={customFieldDefinitions}
        formCustomFields={state.formCustomFields}
        setFormCustomFields={state.setFormCustomFields}
        formNotes={state.formNotes}
        setFormNotes={state.setFormNotes}
        handleSaveAdd={state.handleSaveAdd}
        handleSaveEdit={state.handleSaveEdit}
        showEditModal={state.showEditModal}
      />
    </div>
  );
}
