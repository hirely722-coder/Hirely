import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Plus, FileSpreadsheet, Upload, CheckCircle2, Search, Filter, X
} from 'lucide-react';
import { Job, Company, Candidate } from '../types';
import JobDetailsPage from './job/JobDetailsPage';
import { SearchableDropdown } from './SearchableDropdown';
import { usePermission } from '../hooks/usePermission';
import { useApp } from '../context/AppContext';
import JobFormModal from './job/JobFormModal';
import JobsTable from './job/JobsTable';
import { ExportCsvButton } from './ui/ExportCsvButton';
import { ExportColumn } from '../utils/csvExporter';

const jobsExportColumns: ExportColumn<Job>[] = [
  { header: 'Job Title', key: 'title' },
  { header: 'Company Name', key: 'companyName' },
  { header: 'Location', key: 'location' },
  { header: 'Experience Required', key: 'experience' },
  { header: 'Salary', key: 'salary' },
  { header: 'Status', key: 'status' },
  { header: 'Applications Count', key: 'applicationsCount' },
  { header: 'Required Skills', key: 'requiredSkills', transform: (val: any) => Array.isArray(val) ? val.join(', ') : '' },
  { header: 'Employment Type', key: 'employmentType', transform: (val: any) => val || 'N/A' },
  { header: 'Department', key: 'department', transform: (val: any) => val || 'N/A' },
  { header: 'Urgency', key: 'urgency', transform: (val: any) => val || 'N/A' },
  { header: 'Assigned Recruiter', key: 'recruiterName', transform: (val: any) => val || 'N/A' },
  { header: 'Job Description', key: 'description' }
];

interface JobsViewProps {
  jobs: Job[];
  companies: Company[];
  candidates: Candidate[];
  onAddJob: (job: Job) => Promise<void>;
  onEditJob: (job: Job) => Promise<void>;
  onDeleteJob: (id: string) => void;
  onSendCandidateList: (jobTitle: string, candidateNames: string[]) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onUpdateCandidateStage: (candidateId: string, newStage: Candidate['status']) => void;
  onOpenCSVImport?: (type: 'companies' | 'jobs' | 'candidates') => void;
  isLoading?: boolean;
}

export default function JobsView({
  jobs,
  companies,
  candidates,
  onAddJob,
  onEditJob,
  onDeleteJob,
  onSendCandidateList,
  onEditCandidate,
  onUpdateCandidateStage,
  onOpenCSVImport,
  isLoading = false
}: JobsViewProps) {
  const { showToast, teamMembers, workspace, token: sessionToken, user } = useApp();
  const { can } = usePermission();

  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    }
    return fetch(url, { ...options, headers });
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [companyFilter, setCompanyFilter] = useState<string>('All');

  // Live Job Candidates Mapping State
  const [jobCandidates, setJobCandidates] = useState<any[]>([]);

  const fetchJobCandidates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/job-candidates', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setJobCandidates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch job candidates:', err);
    }
  };

  useEffect(() => {
    fetchJobCandidates();
  }, [jobs, candidates]);

  // Advanced Filters State
  const [experienceFilter, setExperienceFilter] = useState<string>('All');
  const [salaryFilter, setSalaryFilter] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [skillsFilter, setSkillsFilter] = useState<string>('All');
  const [workModeFilter, setWorkModeFilter] = useState<string>('All');
  const [applicationsCountFilter, setApplicationsCountFilter] = useState<string>('All');
  const [requiredSkillsCountFilter, setRequiredSkillsCountFilter] = useState<string>('All');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('All');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Dynamic helper lists for filters
  const locationsList = useMemo(() => {
    const list = new Set<string>();
    (jobs || []).forEach(job => {
      if (job && job.location) {
        const parts = job.location.split(',');
        if (parts.length > 0) {
          const possibleCity = parts[0].trim();
          if (possibleCity && possibleCity.length < 30) {
            list.add(possibleCity);
          }
        }
      }
    });
    return ['All', ...Array.from(list)];
  }, [jobs]);

  const skillsList = useMemo(() => {
    const list = new Set<string>();
    (jobs || []).forEach(job => {
      if (job && job.requiredSkills) {
        job.requiredSkills.forEach(s => {
          if (s && s.trim()) list.add(s.trim());
        });
      }
    });
    return ['All', ...Array.from(list)];
  }, [jobs]);

  const recruitersList = useMemo(() => {
    const list = new Set<string>();
    (jobs || []).forEach(job => {
      if (job && job.recruiterName) {
        list.add(job.recruiterName.trim());
      }
    });
    return ['All', ...Array.from(list)];
  }, [jobs]);

  // Selected Job for Detailed Workspace
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Modals for Create/Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Job | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Notification helper
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter Logic for jobs list
  const filteredJobs = useMemo(() => {
    return (jobs || [])
      .filter(job => {
        if (!job) return false;
        const matchesSearch = 
          (job.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (job.companyName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (job.location || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (job.requiredSkills || []).some(s => (s || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
        
        const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
        const matchesCompany = companyFilter === 'All' || job.companyId === companyFilter;

        // Experience Filter
        let matchesExperience = true;
        if (experienceFilter !== 'All') {
          const jobExpLower = (job.experience || '').toLowerCase();
          if (experienceFilter === 'Entry (0-2 Years)') {
            matchesExperience = jobExpLower.includes('1') || jobExpLower.includes('2') || jobExpLower.includes('entry') || jobExpLower.includes('junior');
          } else if (experienceFilter === 'Mid (3-5 Years)') {
            matchesExperience = jobExpLower.includes('3') || jobExpLower.includes('4') || jobExpLower.includes('5') || jobExpLower.includes('mid');
          } else if (experienceFilter === 'Senior (5+ Years)') {
            matchesExperience = jobExpLower.includes('5+') || jobExpLower.includes('6') || jobExpLower.includes('7') || jobExpLower.includes('8') || jobExpLower.includes('senior');
          } else if (experienceFilter === 'Lead / Staff (9+ Years)') {
            matchesExperience = jobExpLower.includes('9') || jobExpLower.includes('10') || jobExpLower.includes('staff') || jobExpLower.includes('lead') || jobExpLower.includes('principal');
          }
        }

        // Salary Filter
        let matchesSalary = true;
        if (salaryFilter !== 'All') {
          const salaryVal = job.salary || '';
          const numbers = salaryVal.match(/\d+,\d+/g) || salaryVal.match(/\d+/g);
          let averageSalary = 0;
          if (numbers) {
            const parsed = numbers.map(n => parseInt(n.replace(/,/g, '')));
            averageSalary = parsed.reduce((sum, n) => sum + n, 0) / parsed.length;
          }
          
          if (salaryFilter === 'Under ₹100k') {
            matchesSalary = averageSalary > 0 && averageSalary < 100000;
          } else if (salaryFilter === '₹100k - ₹150k') {
            matchesSalary = averageSalary >= 100000 && averageSalary <= 150000;
          } else if (salaryFilter === '₹150k - ₹200k') {
            matchesSalary = averageSalary >= 150000 && averageSalary <= 200000;
          } else if (salaryFilter === 'Over ₹200k') {
            matchesSalary = averageSalary > 200000;
          }
        }

        // Location Filter
        const matchesLocation = locationFilter === 'All' || 
          (job.location || '').toLowerCase().includes((locationFilter || '').toLowerCase());

        // Skills Filter
        const matchesSkills = skillsFilter === 'All' || 
          (job.requiredSkills || []).some(s => (s || '').toLowerCase() === (skillsFilter || '').toLowerCase());

        // Work Mode Filter
        let matchesWorkMode = true;
        if (workModeFilter !== 'All') {
          const locLower = (job.location || '').toLowerCase();
          if (workModeFilter === 'Remote') {
            matchesWorkMode = locLower.includes('remote');
          } else if (workModeFilter === 'Hybrid') {
            matchesWorkMode = locLower.includes('hybrid');
          } else if (workModeFilter === 'In-office') {
            matchesWorkMode = !locLower.includes('remote') && !locLower.includes('hybrid');
          }
        }

        // Applications Count Filter
        let matchesApplicationsCount = true;
        if (applicationsCountFilter !== 'All') {
          const count = jobCandidates.filter(jc => jc.jobId === job.id).length;
          if (applicationsCountFilter === 'No Applications') {
            matchesApplicationsCount = count === 0;
          } else if (applicationsCountFilter === '1-3 Applications') {
            matchesApplicationsCount = count >= 1 && count <= 3;
          } else if (applicationsCountFilter === '4+ Applications') {
            matchesApplicationsCount = count >= 4;
          }
        }

        // Required Skills Count Filter
        let matchesRequiredSkillsCount = true;
        if (requiredSkillsCountFilter !== 'All') {
          const count = (job.requiredSkills || []).length;
          if (requiredSkillsCountFilter === 'Under 3 Skills') {
            matchesRequiredSkillsCount = count < 3;
          } else if (requiredSkillsCountFilter === '3-5 Skills') {
            matchesRequiredSkillsCount = count >= 3 && count <= 5;
          } else if (requiredSkillsCountFilter === 'Over 5 Skills') {
            matchesRequiredSkillsCount = count > 5;
          }
        }

        // Recruiter Filter
        const matchesRecruiter = recruiterFilter === 'All' || job.recruiterName === recruiterFilter;

        return matchesSearch && matchesStatus && matchesCompany && matchesExperience && matchesSalary && matchesLocation && matchesSkills && matchesWorkMode && matchesApplicationsCount && matchesRequiredSkillsCount && matchesRecruiter;
      });
  }, [jobs, searchTerm, statusFilter, companyFilter, experienceFilter, salaryFilter, locationFilter, skillsFilter, workModeFilter, applicationsCountFilter, requiredSkillsCountFilter, recruiterFilter, jobCandidates]);

  // Add Job trigger
  const startAdd = () => {
    if (!can('jobs.add')) {
      showToast('❌ Access Denied: You do not have permission to add job positions.', 'error');
      return;
    }
    setShowAddModal(true);
  };

  // Edit Job trigger
  const startEdit = (job: Job) => {
    if (!can('jobs.edit')) {
      showToast('❌ Access Denied: You do not have permission to edit job positions.', 'error');
      return;
    }
    setShowEditModal(job);
  };

  const handleFormSubmit = async (jobData: Job) => {
    const isEdit = jobs.some(j => j.id === jobData.id);
    if (isEdit) {
      await onEditJob(jobData);
      if (selectedJob?.id === jobData.id) {
        setSelectedJob(jobData);
      }
      setShowEditModal(null);
      showNotice(`✓ Saved changes for ${jobData.title}`);

      // Sync to database assignments
      if (workspace) {
        try {
          const res = await authFetch('/api/job_assignments');
          const currentJobAssigns = await res.json();
          const jobAssignmentsForThisJob = currentJobAssigns.filter((a: any) => a.jobId === jobData.id);
          await Promise.all(jobAssignmentsForThisJob.map((a: any) => authFetch(`/api/job_assignments/${a.id}`, { method: 'DELETE' })));

          const recruiterName = jobData.recruiterName || user?.name;
          const selectedRecruiter = teamMembers.find(tm => tm.name === recruiterName) || teamMembers.find(tm => tm.id === user?.id);
          if (selectedRecruiter) {
            await authFetch('/api/job_assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId: jobData.id, userId: selectedRecruiter.id, workspaceId: workspace.id })
            });
          }
        } catch (err: any) {
          console.error('Failed to sync job assignment edit:', err);
        }
      }
    } else {
      await onAddJob(jobData);
      setShowAddModal(false);
      showNotice(`✓ Published Job Opening: ${jobData.title}`);

      // Sync to database assignments
      if (workspace) {
        const recruiterName = jobData.recruiterName || user?.name;
        const selectedRecruiter = teamMembers.find(tm => tm.name === recruiterName) || teamMembers.find(tm => tm.id === user?.id);
        if (selectedRecruiter) {
          authFetch('/api/job_assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: jobData.id, userId: selectedRecruiter.id, workspaceId: workspace.id })
          }).catch(err => console.error('Failed to sync job assignment:', err));
        }
      }
    }
  };

  const handleDuplicate = (job: Job) => {
    if (!can('jobs.add')) {
      showToast('❌ Access Denied: You do not have permission to add job positions.', 'error');
      return;
    }
    const dup: Job = {
      ...job,
      id: 'j_' + Date.now(),
      title: `${job.title} (Copy)`,
      applicationsCount: 0
    };
    onAddJob(dup);
    showNotice(`✓ Duplicated job opening: ${job.title}`);
  };

  const handleToggleClose = (job: Job) => {
    if (!can('jobs.edit')) {
      showToast('❌ Access Denied: You do not have permission to edit job positions.', 'error');
      return;
    }
    const updated: Job = {
      ...job,
      status: job.status === 'Open' ? 'Closed' : 'Open'
    };
    onEditJob(updated);
    if (selectedJob?.id === job.id) {
      setSelectedJob(updated);
    }
    showNotice(`✓ Successfully marked job as ${updated.status}`);
  };



  // If a job is active, render the comprehensive details workspace!
  if (selectedJob) {
    return (
      <JobDetailsPage 
        job={selectedJob}
        companies={companies}
        candidates={candidates}
        onBack={() => {
          setSelectedJob(null);
        }}
        onEditJob={(updated) => {
          if (!can('jobs.edit')) {
            showToast('❌ Access Denied: You do not have permission to edit job positions.', 'error');
            return;
          }
          onEditJob(updated);
          setSelectedJob(updated);
        }}
        onDeleteJob={(id) => {
          if (!can('jobs.delete')) {
            showToast('❌ Access Denied: You do not have permission to delete job positions.', 'error');
            return;
          }
          onDeleteJob(id);
        }}
        onEditCandidate={onEditCandidate}
        onUpdateCandidateStage={onUpdateCandidateStage}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-700" id="jobs-main-view">
      
      {/* Alert Banner */}
      {notification && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Career Opportunities</h1>
          <p className="text-xs text-slate-500 mt-1">Manage partner recruitment requests, matching vectors, and active hiring pipelines.</p>
        </div>
        <button 
          onClick={startAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors w-full sm:w-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Job Position
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="space-y-3 bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search job title, location, partner, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
            />
          </div>
          
          <div className="w-full grid grid-cols-2 gap-2.5 items-end md:flex md:w-auto md:items-end md:gap-2.5 md:justify-end">
            <div className="w-full md:w-auto">
              <SearchableDropdown
                label="Company"
                options={[{ value: 'All', label: 'All Companies' }, ...companies.map(c => ({ value: c.id, label: c.name }))] }
                value={companyFilter}
                onChange={setCompanyFilter}
                placeholder="Search companies..."
              />
            </div>

            <div className="w-full md:w-auto">
              <SearchableDropdown
                label="Status"
                options={['All', 'Open', 'Closed']}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFiltersPanel(prev => !prev)}
              className={`w-full col-span-2 md:col-span-1 md:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                showFiltersPanel 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Advanced Filters</span>
              {(experienceFilter !== 'All' || salaryFilter !== 'All' || locationFilter !== 'All' || skillsFilter !== 'All' || workModeFilter !== 'All' || applicationsCountFilter !== 'All' || requiredSkillsCountFilter !== 'All' || recruiterFilter !== 'All') && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                  {[experienceFilter, salaryFilter, locationFilter, skillsFilter, workModeFilter, applicationsCountFilter, requiredSkillsCountFilter, recruiterFilter].filter(f => f !== 'All').length}
                </span>
              )}
            </button>

            {onOpenCSVImport && (
              <button 
                onClick={() => {
                  if (!can('jobs.import')) {
                    showToast('❌ Access Denied: You do not have permission to import job postings.', 'error');
                    return;
                  }
                  onOpenCSVImport('jobs');
                }}
                title="Import jobs from a CSV or Excel file"
                className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                <span>Import CSV/Excel</span>
              </button>
            )}

            <ExportCsvButton
              data={filteredJobs}
              columns={jobsExportColumns}
              filename="jobs_list_report"
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              label="Export List"
            />
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showFiltersPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl animate-fade-in text-xs mt-2">
            <SearchableDropdown
              label="Experience Level"
              options={['All', 'Entry (0-2 Years)', 'Mid (3-5 Years)', 'Senior (5+ Years)', 'Lead / Staff (9+ Years)']}
              value={experienceFilter}
              onChange={setExperienceFilter}
              placeholder="Search experience..."
            />

            <SearchableDropdown
              label="Salary Range"
              options={['All', 'Under ₹100k', '₹100k - ₹150k', '₹150k - ₹200k', 'Over ₹200k']}
              value={salaryFilter}
              onChange={setSalaryFilter}
              placeholder="Search salaries..."
            />

            <SearchableDropdown
              label="City / Location"
              options={locationsList}
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="Search locations..."
            />

            <SearchableDropdown
              label="Required Skill"
              options={skillsList}
              value={skillsFilter}
              onChange={setSkillsFilter}
              placeholder="Search skills..."
            />

            <SearchableDropdown
              label="Work Mode"
              options={['All', 'Remote', 'Hybrid', 'In-office']}
              value={workModeFilter}
              onChange={setWorkModeFilter}
            />

            <SearchableDropdown
              label="Applications Volume"
              options={['All', 'No Applications', '1-3 Applications', '4+ Applications']}
              value={applicationsCountFilter}
              onChange={setApplicationsCountFilter}
            />

            <SearchableDropdown
              label="Skills Count Required"
              options={['All', 'Under 3 Skills', '3-5 Skills', 'Over 5 Skills']}
              value={requiredSkillsCountFilter}
              onChange={setRequiredSkillsCountFilter}
            />

            <SearchableDropdown
              label="Assigned Recruiter"
              options={recruitersList}
              value={recruiterFilter}
              onChange={setRecruiterFilter}
              placeholder="Search recruiters..."
            />

            {/* Clear Filters Button */}
            <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-200/50 mt-1">
              <button
                type="button"
                onClick={() => {
                  setExperienceFilter('All');
                  setSalaryFilter('All');
                  setLocationFilter('All');
                  setSkillsFilter('All');
                  setWorkModeFilter('All');
                  setApplicationsCountFilter('All');
                  setRequiredSkillsCountFilter('All');
                  setRecruiterFilter('All');
                  setCompanyFilter('All');
                  setStatusFilter('All');
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100/50 cursor-pointer transition-all"
              >
                <X className="h-3 w-3" />
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extracted Clean Table of Career Positions */}
      <JobsTable
        jobs={filteredJobs}
        jobCandidates={jobCandidates}
        isLoading={isLoading}
        onSelectJob={setSelectedJob}
        onEditJob={startEdit}
        onDuplicateJob={handleDuplicate}
        onToggleStatus={handleToggleClose}
        onDeleteJob={onDeleteJob}
        canDelete={can('jobs.delete')}
        canEdit={can('jobs.edit')}
      />

      {/* Unified Add/Edit Form Modal */}
      <JobFormModal
        isOpen={showAddModal || !!showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(null);
        }}
        onSubmit={handleFormSubmit}
        job={showEditModal}
        companies={companies}
        teamMembers={teamMembers}
      />
    </div>
  );
}
