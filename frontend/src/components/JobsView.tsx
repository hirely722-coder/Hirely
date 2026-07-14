import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Briefcase, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Eye, Edit2, Trash2, Copy, Sparkles, X, Mail, CheckCircle2, AlertCircle, Plus, DollarSign, MapPin, Award, FileSpreadsheet, Upload
} from 'lucide-react';
import { Job, Company, Candidate } from '../types';
import JobDetailsPage from './job/JobDetailsPage';
import Portal from './Portal';
import { SearchableDropdown } from './SearchableDropdown';
import { usePermission } from '../hooks/usePermission';
import { useApp } from '../context/AppContext';

const EXPERIENCE_OPTIONS = ['Entry (0-2 Years)', 'Mid (3-5 Years)', 'Senior (5+ Years)', 'Lead / Staff (9+ Years)'];
const SALARY_OPTIONS = ['₹50,000 - ₹80,000', '₹80,000 - ₹120,000', '₹120,000 - ₹150,000', '₹150,000 - ₹180,000', '₹180,000 - ₹220,000', 'Over ₹220,000'];

interface JobsViewProps {
  jobs: Job[];
  companies: Company[];
  candidates: Candidate[];
  onAddJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
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
  const { showToast } = useApp();
  const { can } = usePermission();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'title' | 'company' | 'applications'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Selected Job for Detailed Workspace
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Modals for Create/Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Job | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formExperience, setFormExperience] = useState('5+ Years');
  const [formLocation, setFormLocation] = useState('San Francisco, CA');
  const [formDescription, setFormDescription] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('React, TypeScript, CSS');
  const [formSalary, setFormSalary] = useState('₹150,000 - ₹180,000');
  const [formStatus, setFormStatus] = useState<'Open' | 'Closed'>('Open');
  const [formEmploymentType, setFormEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Internship'>('Full-time');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formUrgency, setFormUrgency] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [formRecruiterName, setFormRecruiterName] = useState('Sarah Jenkins');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Notification helper
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter & Sort Logic for jobs list
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
          // Calculate an approximate value from the salary string (e.g., "$150,000 - $180,000")
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

        return matchesSearch && matchesStatus && matchesCompany && matchesExperience && matchesSalary && matchesLocation && matchesSkills && matchesWorkMode && matchesApplicationsCount && matchesRequiredSkillsCount;
      })
      .sort((a, b) => {
        let valA: any = a.title;
        let valB: any = b.title;

        if (sortBy === 'company') {
          valA = a.companyName;
          valB = b.companyName;
        } else if (sortBy === 'applications') {
          valA = jobCandidates.filter(jc => jc.jobId === a.id).length;
          valB = jobCandidates.filter(jc => jc.jobId === b.id).length;
        }

        if (sortOrder === 'asc') {
          return valA.toString().localeCompare(valB.toString());
        } else {
          return valB.toString().localeCompare(valA.toString());
        }
      });
  }, [jobs, searchTerm, statusFilter, companyFilter, sortBy, sortOrder, experienceFilter, salaryFilter, locationFilter, skillsFilter, workModeFilter, applicationsCountFilter, requiredSkillsCountFilter, jobCandidates]);

  const paginatedJobs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredJobs, currentPage]);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;

  // Add Job trigger
  const startAdd = () => {
    if (!can('jobs.add')) {
      showToast('❌ Access Denied: You do not have permission to add job positions.', 'error');
      return;
    }
    setFormTitle('');
    setFormCompanyId(companies[0]?.id || '');
    setFormExperience('5+ Years');
    setFormLocation('San Francisco, CA / Hybrid');
    setFormDescription('');
    setFormSkillsText('React, TypeScript, Tailwind CSS');
    setFormSalary('₹150,000 - ₹180,000');
    setFormStatus('Open');
    setFormEmploymentType('Full-time');
    setFormDepartment('Engineering');
    setFormUrgency('Medium');
    setFormRecruiterName('Sarah Jenkins');
    setShowAddModal(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;

    const selectedComp = companies.find(c => c.id === formCompanyId);
    const companyNameVal = selectedComp ? selectedComp.name : "None";
    const companyIdVal = selectedComp ? selectedComp.id : null;

    const newJob: Job = {
      id: 'j_' + Date.now(),
      title: formTitle,
      companyId: companyIdVal,
      companyName: companyNameVal,
      experience: formExperience,
      location: formLocation,
      applicationsCount: 0,
      status: formStatus,
      description: formDescription,
      requiredSkills: formSkillsText.split(',').map(s => s.trim()).filter(Boolean),
      salary: formSalary,
      employmentType: formEmploymentType,
      department: formDepartment,
      urgency: formUrgency,
      recruiterName: formRecruiterName
    };

    onAddJob(newJob);
    setShowAddModal(false);
    showNotice(`✓ Published Job Opening: ${newJob.title}`);
  };

  // Edit Job trigger
  const startEdit = (job: Job) => {
    if (!can('jobs.edit')) {
      showToast('❌ Access Denied: You do not have permission to edit job positions.', 'error');
      return;
    }
    setFormTitle(job.title);
    setFormCompanyId(job.companyId || '');
    setFormExperience(job.experience);
    setFormLocation(job.location);
    setFormDescription(job.description || '');
    setFormSkillsText(job.requiredSkills.join(', '));
    setFormSalary(job.salary);
    setFormStatus(job.status);
    setFormEmploymentType(job.employmentType || 'Full-time');
    setFormDepartment(job.department || 'Engineering');
    setFormUrgency(job.urgency || 'Medium');
    setFormRecruiterName(job.recruiterName || 'Sarah Jenkins');
    setShowEditModal(job);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || !formTitle) return;

    const selectedComp = companies.find(c => c.id === formCompanyId);
    const companyNameVal = selectedComp ? selectedComp.name : "None";
    const companyIdVal = selectedComp ? selectedComp.id : null;

    const updated: Job = {
      ...showEditModal,
      title: formTitle,
      companyId: companyIdVal,
      companyName: companyNameVal,
      experience: formExperience,
      location: formLocation,
      description: formDescription,
      requiredSkills: formSkillsText.split(',').map(s => s.trim()).filter(Boolean),
      salary: formSalary,
      status: formStatus,
      employmentType: formEmploymentType,
      department: formDepartment,
      urgency: formUrgency,
      recruiterName: formRecruiterName
    };

    onEditJob(updated);
    if (selectedJob?.id === updated.id) {
      setSelectedJob(updated);
    }
    setShowEditModal(null);
    showNotice(`✓ Saved changes for ${updated.title}`);
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

  const handleSort = (field: 'title' | 'company' | 'applications') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Export to CSV of the jobs list table
  const handleExportCSV = () => {
    const headers = ['Job Title,Company,Location,Experience,Salary Range,Status,Applications Count'];
    const rows = filteredJobs.map(job => {
      return `"${job.title}","${job.companyName}","${job.location}","${job.experience}","${job.salary}","${job.status}",${job.applicationsCount}`;
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Jobs_List_Report.csv';
    link.click();
    showNotice('✓ Jobs List successfully exported to CSV!');
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
          // Refresh list pointers
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
    <div className="space-y-6 animate-fade-in" id="jobs-main-view">
      
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
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors w-full sm:w-auto"
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
              {(experienceFilter !== 'All' || salaryFilter !== 'All' || locationFilter !== 'All' || skillsFilter !== 'All' || workModeFilter !== 'All' || applicationsCountFilter !== 'All' || requiredSkillsCountFilter !== 'All') && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                  {[experienceFilter, salaryFilter, locationFilter, skillsFilter, workModeFilter, applicationsCountFilter, requiredSkillsCountFilter].filter(f => f !== 'All').length}
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
                className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-slate-500" />
                <span>Import CSV/Excel</span>
              </button>
            )}

            <button 
              onClick={handleExportCSV}
              title="Export full list to CSV sheet"
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
              <span>Export List</span>
            </button>
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

      {/* Redesigned Clean Table of Career Positons */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th 
                  onClick={() => handleSort('title')}
                  className="p-4 font-bold cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Job Title
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('company')}
                  className="p-4 font-bold cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Company
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 font-bold">Location</th>
                <th className="p-4 font-bold">Experience</th>
                <th className="p-4 font-bold">Salary</th>
                <th className="p-4 font-bold text-center">Applications</th>
                <th className="p-4 font-bold text-center">Shortlisted</th>
                <th className="p-4 font-bold text-center">Interviews</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold">Assigned Recruiter</th>
                <th className="p-4 font-bold">Created Date</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                [...Array(5)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="animate-pulse">
                    <td className="p-4">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-20 bg-slate-200 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-3.5 w-16 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-3.5 w-12 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-3.5 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-block h-3.5 w-6 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-block h-3.5 w-6 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-block h-3.5 w-6 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-5 w-14 bg-slate-100 rounded-full" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-block h-6 w-12 bg-slate-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400">
                    No active job positions match your criteria. Publish a new request or adjust filters.
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => {
                  // Dynamic statistics mapped in real-time to the database jobCandidates state
                  const linkedRelations = jobCandidates.filter(jc => jc.jobId === job.id);
                  const applications = linkedRelations.length;
                  const shortlisted = linkedRelations.filter(jc => jc.stage === 'Shortlisted' || jc.stage === 'Screening').length;
                  const interviewPool = linkedRelations.filter(jc => jc.stage === 'Interview').length;

                  return (
                    <tr 
                      key={job.id}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-900 font-sans hover:underline">
                          {job.title}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{job.companyName || 'None'}</td>
                      <td className="p-4 text-slate-500">{job.location}</td>
                      <td className="p-4 font-mono font-medium text-slate-600">{job.experience}</td>
                      <td className="p-4 font-medium text-slate-800 font-sans">{job.salary}</td>
                      
                      {/* Realistic Counters */}
                      <td className="p-4 text-center font-mono font-bold text-slate-800">{applications}</td>
                      <td className="p-4 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20">{shortlisted}</td>
                      <td className="p-4 text-center font-mono font-bold text-blue-600 bg-blue-50/20">{interviewPool}</td>
                      
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-bold border ${
                          job.status === 'Open' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="h-5 w-5 rounded-full bg-slate-900 text-white font-mono flex items-center justify-center text-[9px] font-bold">
                            {(job.recruiterName || 'Sarah Jenkins').split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                          <span className="text-slate-600 font-semibold">{job.recruiterName || 'Sarah Jenkins'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[10px]">2026-06-24</td>
                      
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedJob(job)}
                            title="Open detailed workspace"
                            className="p-1 text-slate-400 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => startEdit(job)}
                            title="Edit job parameters"
                            className="p-1 text-slate-400 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDuplicate(job)}
                            title="Duplicate opening"
                            className="p-1 text-slate-400 hover:text-emerald-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleClose(job)}
                            title={job.status === 'Open' ? 'Close Opening' : 'Reopen Opening'}
                            className={`p-1 text-slate-400 ${job.status === 'Open' ? 'hover:text-amber-600' : 'hover:text-emerald-600'}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (!can('jobs.delete')) {
                                showToast('❌ Access Denied: You do not have permission to delete job positions.', 'error');
                                return;
                              }
                              if (confirm(`Are you sure you want to delete ${job.title}?`)) {
                                onDeleteJob(job.id);
                              }
                            }}
                            title="Delete position"
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{Math.min(filteredJobs.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredJobs.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredJobs.length}</strong> postings
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono font-semibold">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-sm font-bold text-slate-950 font-sans flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-slate-500" />
                Add New Job Position
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="E.g., Senior Full-Stack Developer"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Partner Company *</label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="">None</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Required Experience</label>
                  <select
                    value={EXPERIENCE_OPTIONS.includes(formExperience) ? formExperience : 'Custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setFormExperience('');
                      } else {
                        setFormExperience(val);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Entry (0-2 Years)">Entry (0-2 Years)</option>
                    <option value="Mid (3-5 Years)">Mid (3-5 Years)</option>
                    <option value="Senior (5+ Years)">Senior (5+ Years)</option>
                    <option value="Lead / Staff (9+ Years)">Lead / Staff (9+ Years)</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {!EXPERIENCE_OPTIONS.includes(formExperience) && (
                    <input
                      type="text"
                      value={formExperience}
                      onChange={(e) => setFormExperience(e.target.value)}
                      placeholder="Enter custom experience (e.g., 6+ Years)"
                      className="w-full mt-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Salary Range</label>
                  <select
                    value={SALARY_OPTIONS.includes(formSalary) ? formSalary : 'Custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setFormSalary('');
                      } else {
                        setFormSalary(val);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="₹50,000 - ₹80,000">₹50,000 - ₹80,000</option>
                    <option value="₹80,000 - ₹120,000">₹80,000 - ₹120,000</option>
                    <option value="₹120,000 - ₹150,000">₹120,000 - ₹150,000</option>
                    <option value="₹150,000 - ₹180,000">₹150,000 - ₹180,000</option>
                    <option value="₹180,000 - ₹220,000">₹180,000 - ₹220,000</option>
                    <option value="Over ₹220,000">Over ₹220,000</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {!SALARY_OPTIONS.includes(formSalary) && (
                    <input
                      type="text"
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      placeholder="Enter custom salary range (e.g., ₹250k - ₹300k)"
                      className="w-full mt-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="E.g., Remote (US) / San Francisco, CA"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Employment Type</label>
                  <select
                    value={formEmploymentType}
                    onChange={(e: any) => setFormEmploymentType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="E.g., Engineering, Marketing"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Urgency Level</label>
                  <select
                    value={formUrgency}
                    onChange={(e: any) => setFormUrgency(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Assigned Recruiter</label>
                  <input
                    type="text"
                    value={formRecruiterName}
                    onChange={(e) => setFormRecruiterName(e.target.value)}
                    placeholder="E.g., Sarah Jenkins"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Required Skills (Comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={formSkillsText}
                    onChange={(e) => setFormSkillsText(e.target.value)}
                    placeholder="React, TypeScript, Tailwind CSS, PostgreSQL"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Position Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe core job responsibilities, company growth, and team mission..."
                    rows={4}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors"
                >
                  Publish Opening
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

      {showEditModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-sm font-bold text-slate-950 font-sans flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-slate-500" />
                Edit Job: {showEditModal.title}
              </h2>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Partner Company *</label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="">None</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Required Experience</label>
                  <select
                    value={EXPERIENCE_OPTIONS.includes(formExperience) ? formExperience : 'Custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setFormExperience('');
                      } else {
                        setFormExperience(val);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Entry (0-2 Years)">Entry (0-2 Years)</option>
                    <option value="Mid (3-5 Years)">Mid (3-5 Years)</option>
                    <option value="Senior (5+ Years)">Senior (5+ Years)</option>
                    <option value="Lead / Staff (9+ Years)">Lead / Staff (9+ Years)</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {!EXPERIENCE_OPTIONS.includes(formExperience) && (
                    <input
                      type="text"
                      value={formExperience}
                      onChange={(e) => setFormExperience(e.target.value)}
                      placeholder="Enter custom experience (e.g., 6+ Years)"
                      className="w-full mt-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Salary Range</label>
                  <select
                    value={SALARY_OPTIONS.includes(formSalary) ? formSalary : 'Custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Custom') {
                        setFormSalary('');
                      } else {
                        setFormSalary(val);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="₹50,000 - ₹80,000">₹50,000 - ₹80,000</option>
                    <option value="₹80,000 - ₹120,000">₹80,000 - ₹120,000</option>
                    <option value="₹120,000 - ₹150,000">₹120,000 - ₹150,000</option>
                    <option value="₹150,000 - ₹180,000">₹150,000 - ₹180,000</option>
                    <option value="₹180,000 - ₹220,000">₹180,000 - ₹220,000</option>
                    <option value="Over ₹220,000">Over ₹220,000</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {!SALARY_OPTIONS.includes(formSalary) && (
                    <input
                      type="text"
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      placeholder="Enter custom salary range (e.g., ₹250k - ₹300k)"
                      className="w-full mt-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Job Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Employment Type</label>
                  <select
                    value={formEmploymentType}
                    onChange={(e: any) => setFormEmploymentType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="E.g., Engineering, Marketing"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Urgency Level</label>
                  <select
                    value={formUrgency}
                    onChange={(e: any) => setFormUrgency(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Assigned Recruiter</label>
                  <input
                    type="text"
                    value={formRecruiterName}
                    onChange={(e) => setFormRecruiterName(e.target.value)}
                    placeholder="E.g., Sarah Jenkins"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Required Skills (Comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={formSkillsText}
                    onChange={(e) => setFormSkillsText(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Position Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

    </div>
  );
}
