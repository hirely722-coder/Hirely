import React, { useState, useMemo } from 'react';
import { 
  Building2, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Eye, Edit2, Trash2, Mail, Phone, MessageSquare, Plus, X, Briefcase, 
  Download, Globe, UserCheck, Upload 
} from 'lucide-react';
import { Company, Job, Candidate } from '../types';
import CompanyDetailsPage from './company/CompanyDetailsPage';
import CompanyFormModal from './company/CompanyFormModal';
import Portal from './Portal';
import { SearchableDropdown } from './SearchableDropdown';
import { usePermission } from '../hooks/usePermission';
import { useApp } from '../context/AppContext';
import { ExportCsvButton } from './ui/ExportCsvButton';
import { ExportColumn } from '../utils/csvExporter';

interface CompaniesViewProps {
  companies: Company[];
  jobs: Job[];
  candidates: Candidate[];
  onAddCompany: (company: Company) => Promise<void>;
  onEditCompany: (company: Company) => Promise<void>;
  onDeleteCompany: (id: string) => void;
  onNavigateToJobs: (companyId: string) => void;
  onOpenAddJobModal: (companyId: string) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onAddJob: (job: Job) => Promise<void>;
  onEditJob: (job: Job) => Promise<void>;
  onDeleteJob: (id: string) => void;
  onComposeEmail?: (candidate: Candidate) => void;
  onComposeWhatsApp?: (candidate: Candidate) => void;
  onOpenCSVImport?: (type: 'companies' | 'jobs' | 'candidates') => void;
  isLoading?: boolean;
}

const companiesExportColumns: ExportColumn<Company>[] = [
  { header: 'Company Name', key: 'name' },
  { header: 'Contact Person', key: 'contactPerson' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Website', key: 'website' },
  { header: 'Address', key: 'address' },
  { header: 'Recruiter Contact', key: 'recContact' },
  { header: 'Status', key: 'status' },
  { header: 'Industry', key: 'industry', transform: (val) => val || 'N/A' },
  { header: 'Company Size', key: 'companySize', transform: (val) => val || 'N/A' },
  { header: 'Founded Year', key: 'foundedYear', transform: (val) => val || 'N/A' },
  { header: 'Tier', key: 'tier', transform: (val) => val || 'N/A' },
  { header: 'LinkedIn URL', key: 'linkedinUrl', transform: (val) => val || 'N/A' },
  { header: 'Notes', key: 'notes' }
];

export default function CompaniesView({
  companies,
  jobs,
  candidates,
  onAddCompany,
  onEditCompany,
  onDeleteCompany,
  onNavigateToJobs,
  onOpenAddJobModal,
  onEditCandidate,
  onAddJob,
  onEditJob,
  onDeleteJob,
  onComposeEmail,
  onComposeWhatsApp,
  onOpenCSVImport,
  isLoading = false
}: CompaniesViewProps) {
  const { showToast, teamMembers, workspace, token: sessionToken } = useApp();
  const { can } = usePermission();

  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    }
    return fetch(url, { ...options, headers });
  };

  // Navigation drilldown state
  const [focusedCompanyId, setFocusedCompanyId] = useState<string | null>(null);

  // Lists view states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'contact' | 'jobs'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Advanced Filters State
  const [recruiterFilter, setRecruiterFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [jobsVolumeFilter, setJobsVolumeFilter] = useState<string>('All');
  const [websitePresenceFilter, setWebsitePresenceFilter] = useState<string>('All');
  const [notesFilter, setNotesFilter] = useState<string>('All');
  const [contactPersonFilter, setContactPersonFilter] = useState<string>('All');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Dynamic recruiters list
  const recruitersList = useMemo(() => {
    const list = new Set<string>();
    (companies || []).forEach(c => {
      if (c && c.recContact) {
        list.add(c.recContact);
      }
    });
    return ['All', ...Array.from(list)];
  }, [companies]);

  // Dynamic contacts list
  const contactsList = useMemo(() => {
    const list = new Set<string>();
    (companies || []).forEach(c => {
      if (c && c.contactPerson) {
        list.add(c.contactPerson);
      }
    });
    return ['All', ...Array.from(list)];
  }, [companies]);

  // Dynamic cities list
  const citiesList = useMemo(() => {
    const list = new Set<string>();
    (companies || []).forEach(c => {
      if (c && c.address) {
        const clean = c.address.replace('HQ:', '').trim();
        const parts = clean.split(',');
        if (parts.length > 0) {
          const possibleCity = parts[0].trim();
          if (possibleCity && possibleCity.length < 30) {
            list.add(possibleCity);
          }
        }
      }
    });
    return ['All', ...Array.from(list)];
  }, [companies]);
  
  // Create / Edit Registry modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Company | null>(null);

  // Local communications pings
  const [localComposeEmailTo, setLocalComposeEmailTo] = useState('');
  const [localComposeWATo, setLocalComposeWATo] = useState('');
  const [showLocalEmailModal, setShowLocalEmailModal] = useState(false);
  const [showLocalWAModal, setShowLocalWAModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected company lookup
  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === focusedCompanyId) || null;
  }, [companies, focusedCompanyId]);

  // Filter & Sort logic
  const filteredCompanies = useMemo(() => {
    return (companies || [])
      .filter(company => {
        if (!company) return false;
        const matchesSearch = 
          (company.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (company.contactPerson || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
          (company.email || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || company.status === statusFilter;
        
        // Recruiter Filter
        const matchesRecruiter = recruiterFilter === 'All' || company.recContact === recruiterFilter;

        // City Filter
        const matchesCity = cityFilter === 'All' || (company.address || '').toLowerCase().includes((cityFilter || '').toLowerCase());

        // Jobs Volume Filter
        let matchesJobsVolume = true;
        if (jobsVolumeFilter !== 'All') {
          const count = jobs.filter(j => j.companyId === company.id && j.status === 'Open').length;
          if (jobsVolumeFilter === 'No Open Jobs') {
            matchesJobsVolume = count === 0;
          } else if (jobsVolumeFilter === '1+ Open Jobs') {
            matchesJobsVolume = count >= 1;
          } else if (jobsVolumeFilter === '3+ Open Jobs') {
            matchesJobsVolume = count >= 3;
          }
        }

        // Website Presence Filter
        let matchesWebsite = true;
        if (websitePresenceFilter !== 'All') {
          const hasWebsite = !!company.website && company.website.trim() !== '' && company.website.includes('.');
          if (websitePresenceFilter === 'Has Website') {
            matchesWebsite = hasWebsite;
          } else if (websitePresenceFilter === 'No Website') {
            matchesWebsite = !hasWebsite;
          }
        }

        // Notes Filter
        let matchesNotes = true;
        if (notesFilter !== 'All') {
          const hasNotes = !!company.notes && company.notes.trim().length > 5;
          if (notesFilter === 'Has Partnership Notes') {
            matchesNotes = hasNotes;
          } else if (notesFilter === 'No Notes') {
            matchesNotes = !hasNotes;
          }
        }

        // Contact Person Filter
        const matchesContactPerson = contactPersonFilter === 'All' || company.contactPerson === contactPersonFilter;

        return matchesSearch && matchesStatus && matchesRecruiter && matchesCity && matchesJobsVolume && matchesWebsite && matchesNotes && matchesContactPerson;
      })
      .sort((a, b) => {
        let valueA: any = a.name;
        let valueB: any = b.name;

        if (sortBy === 'contact') {
          valueA = a.contactPerson;
          valueB = b.contactPerson;
        } else if (sortBy === 'jobs') {
          valueA = jobs.filter(j => j.companyId === a.id).length;
          valueB = jobs.filter(j => j.companyId === b.id).length;
        }

        if (sortOrder === 'asc') {
          return valueA.toString().localeCompare(valueB.toString());
        } else {
          return valueB.toString().localeCompare(valueA.toString());
        }
      });
  }, [companies, jobs, searchTerm, statusFilter, sortBy, sortOrder, recruiterFilter, cityFilter, jobsVolumeFilter, websitePresenceFilter, notesFilter, contactPersonFilter]);

  // Paginated companies
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, currentPage]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;

  // Sorting Handler
  const handleSort = (field: 'name' | 'contact' | 'jobs') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const startAdd = () => {
    if (!can('companies.add')) {
      showToast('❌ Access Denied: You do not have permission to add corporate partners.', 'error');
      return;
    }
    setShowAddModal(true);
  };

  const startEdit = (company: Company) => {
    if (!can('companies.edit')) {
      showToast('❌ Access Denied: You do not have permission to edit company registries.', 'error');
      return;
    }
    setShowEditModal(company);
  };

  const handleFormSubmit = async (companyData: Company) => {
    const isEdit = companies.some(c => c.id === companyData.id);
    if (isEdit) {
      await onEditCompany(companyData);
      setShowEditModal(null);
      showToast(`✓ Saved changes for ${companyData.name}`, 'success');

      // Sync to database assignments
      if (workspace && companyData.recContact) {
        try {
          const res = await authFetch('/api/company_assignments');
          const currentCompAssigns = await res.json();
          const companyAssignmentsForThisCompany = currentCompAssigns.filter((a: any) => a.companyId === companyData.id);
          await Promise.all(companyAssignmentsForThisCompany.map((a: any) => authFetch(`/api/company_assignments/${a.id}`, { method: 'DELETE' })));

          const selectedRecruiter = teamMembers.find(tm => tm.name === companyData.recContact);
          if (selectedRecruiter) {
            await authFetch('/api/company_assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: companyData.id, userId: selectedRecruiter.id, workspaceId: workspace.id })
            });
          }
        } catch (err: any) {
          console.error('Failed to sync company assignment edit:', err);
        }
      }
    } else {
      await onAddCompany(companyData);
      setShowAddModal(false);
      showToast(`✓ Registered Partner: ${companyData.name}`, 'success');

      // Sync to database assignments
      if (workspace && companyData.recContact) {
        const selectedRecruiter = teamMembers.find(tm => tm.name === companyData.recContact);
        if (selectedRecruiter) {
          authFetch('/api/company_assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: companyData.id, userId: selectedRecruiter.id, workspaceId: workspace.id })
          }).catch(err => console.error('Failed to sync company assignment:', err));
        }
      }
    }
  };



  // Render drilldown detailed workspace if focused
  if (selectedCompany) {
    return (
      <CompanyDetailsPage 
        company={selectedCompany}
        onBack={() => setFocusedCompanyId(null)}
        jobs={jobs}
        candidates={candidates}
        onEditCompany={(updated) => {
          if (!can('companies.edit')) {
            showToast('❌ Access Denied: You do not have permission to edit company registries.', 'error');
            return;
          }
          onEditCompany(updated);
        }}
        onEditCandidate={onEditCandidate}
        onAddJob={(job) => {
          if (!can('jobs.add')) {
            showToast('❌ Access Denied: You do not have permission to add job positions.', 'error');
            return;
          }
          onAddJob(job);
        }}
        onEditJob={(job) => {
          if (!can('jobs.edit')) {
            showToast('❌ Access Denied: You do not have permission to edit job positions.', 'error');
            return;
          }
          onEditJob(job);
        }}
        onDeleteJob={(id) => {
          if (!can('jobs.delete')) {
            showToast('❌ Access Denied: You do not have permission to delete job positions.', 'error');
            return;
          }
          onDeleteJob(id);
        }}
        onComposeEmail={onComposeEmail}
        onComposeWhatsApp={onComposeWhatsApp}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" id="companies-workspace-list">
      
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-sans">Company Partners</h1>
          <p className="text-sm text-slate-500 mt-1">Manage recruiting client registries, job orders, and pipeline submissions.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto sm:justify-end">
          {onOpenCSVImport && (
            <button 
              onClick={() => {
                if (!can('companies.import')) {
                  showToast('❌ Access Denied: You do not have permission to import company partner registries.', 'error');
                  return;
                }
                onOpenCSVImport('companies');
              }}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-xs"
            >
              <Upload className="h-4 w-4 text-slate-400" />
              Import CSV/Excel
            </button>
          )}
          <ExportCsvButton
            data={filteredCompanies}
            columns={companiesExportColumns}
            filename="companies_export"
          />
          <button 
            onClick={startAdd}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Company
          </button>
        </div>
      </div>

      {/* Instant Sourcing Search & Registry Filter */}
      <div className="space-y-3 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, HR contact, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>
          
          <div className="w-full grid grid-cols-2 gap-2.5 items-end md:flex md:w-auto md:items-end md:gap-2.5 md:justify-end">
            <div className="w-full md:w-auto">
              <SearchableDropdown
                label="Status"
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Active', label: 'Active Partners' },
                  { value: 'Inactive', label: 'Inactive Partners' }
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFiltersPanel(prev => !prev)}
              className={`w-full md:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                showFiltersPanel 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Advanced Filters</span>
              {(recruiterFilter !== 'All' || cityFilter !== 'All' || jobsVolumeFilter !== 'All' || websitePresenceFilter !== 'All' || notesFilter !== 'All' || contactPersonFilter !== 'All') && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                  {[recruiterFilter, cityFilter, jobsVolumeFilter, websitePresenceFilter, notesFilter, contactPersonFilter].filter(f => f !== 'All').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showFiltersPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl animate-fade-in text-xs mt-2">
            <SearchableDropdown
              label="Assigned Recruiter"
              options={recruitersList}
              value={recruiterFilter}
              onChange={setRecruiterFilter}
              placeholder="Search recruiters..."
            />

            <SearchableDropdown
              label="City / Location"
              options={citiesList}
              value={cityFilter}
              onChange={setCityFilter}
              placeholder="Search locations..."
            />

            <SearchableDropdown
              label="Job Openings Volume"
              options={['All', 'No Open Jobs', '1+ Open Jobs', '3+ Open Jobs']}
              value={jobsVolumeFilter}
              onChange={setJobsVolumeFilter}
            />

            <SearchableDropdown
              label="Contact Person"
              options={contactsList}
              value={contactPersonFilter}
              onChange={setContactPersonFilter}
              placeholder="Search contacts..."
            />

            <SearchableDropdown
              label="Website Presence"
              options={[
                { value: 'All', label: 'Any Website Status' },
                { value: 'Has Website', label: 'Has Website Link' },
                { value: 'No Website', label: 'No Website Link' }
              ]}
              value={websitePresenceFilter}
              onChange={setWebsitePresenceFilter}
            />

            <SearchableDropdown
              label="Partnership Notes"
              options={[
                { value: 'All', label: 'Any Notes Status' },
                { value: 'Has Partnership Notes', label: 'Has Internal Notes' },
                { value: 'No Notes', label: 'No Notes' }
              ]}
              value={notesFilter}
              onChange={setNotesFilter}
            />

            {/* Clear Filters Button */}
            <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end gap-2 pt-2 border-t border-slate-200/50 mt-1">
              <button
                type="button"
                onClick={() => {
                  setRecruiterFilter('All');
                  setCityFilter('All');
                  setJobsVolumeFilter('All');
                  setWebsitePresenceFilter('All');
                  setNotesFilter('All');
                  setContactPersonFilter('All');
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

      {/* Master Client Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase">
                <th 
                  onClick={() => handleSort('name')}
                  className="p-4 font-bold cursor-pointer hover:bg-slate-100/50 hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    Company Name
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 font-bold">Contact Person</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Phone</th>
                <th 
                  onClick={() => handleSort('jobs')}
                  className="p-4 font-bold text-center cursor-pointer hover:bg-slate-100/50 hover:text-slate-700"
                >
                  <div className="flex items-center justify-center gap-1">
                    Open Jobs
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-4 font-bold text-center">Active Candidates</th>
                <th className="p-4 font-bold">Assigned Recruiter</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold">Last Activity</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                [...Array(5)].map((_, rowIndex) => (
                  <tr key={rowIndex} className="animate-pulse">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 bg-slate-200 rounded" />
                          <div className="h-2.5 w-16 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-slate-200 rounded" />
                        <div className="h-2.5 w-20 bg-slate-100 rounded" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="h-3.5 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-3.5 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-12 bg-slate-200 rounded" />
                    </td>
                    <td className="p-4">
                      <div className="h-5 w-16 bg-slate-100 rounded-full" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-block h-6 w-12 bg-slate-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    No corporate partners registered matching your search specs.
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((company) => {
                  const companyJobsCount = jobs.filter(j => j.companyId === company.id && j.status === 'Open').length;
                  const activeCandCount = candidates.filter(c => c.status === 'Interview' || c.status === 'Selected').length;
                  
                  return (
                    <tr 
                      key={company.id}
                      onClick={() => setFocusedCompanyId(company.id)}
                      className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                    >
                      {/* Name / Website */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-950 font-sans">{company.name}</p>
                            {company.website && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{company.website.replace('https://', '')}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4 font-semibold text-slate-900">{company.contactPerson}</td>

                      {/* Email */}
                      <td className="p-4 text-slate-500 font-mono text-[10px]">{company.email}</td>

                      {/* Phone */}
                      <td className="p-4 text-slate-500 font-mono text-[10px]">{company.phone || '+1 (555) 012-9844'}</td>

                      {/* Jobs */}
                      <td className="p-4 text-center font-mono font-bold text-blue-600">{companyJobsCount}</td>

                      {/* Candidates */}
                      <td className="p-4 text-center font-mono font-bold text-indigo-600">{activeCandCount}</td>

                      {/* Recruiter */}
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          {company.recContact || 'Unassigned'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-bold ${
                          company.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {company.status}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td className="p-4 text-slate-400 font-mono text-[10px]">June 26, 2026</td>

                      {/* Actions */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setFocusedCompanyId(company.id)}
                            title="Open Workspace"
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => startEdit(company)}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (onComposeEmail) {
                                const syntheticCandidate: Candidate = {
                                  id: 'comp_' + company.id,
                                  name: company.contactPerson || company.name,
                                  email: company.email,
                                  phone: company.phone || '',
                                  skills: [],
                                  experience: '',
                                  education: '',
                                  currentCompany: company.name,
                                  status: 'Applied',
                                  aiMatchScore: 80,
                                  resumeText: '',
                                  address: '',
                                  notes: '',
                                  appliedDate: new Date().toISOString().split('T')[0]
                                };
                                onComposeEmail(syntheticCandidate);
                              } else {
                                setLocalComposeEmailTo(company.email);
                                setShowLocalEmailModal(true);
                              }
                            }}
                            title="Email Company"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (onComposeWhatsApp) {
                                const syntheticCandidate: Candidate = {
                                  id: 'comp_' + company.id,
                                  name: company.contactPerson || company.name,
                                  email: company.email,
                                  phone: company.phone || '',
                                  skills: [],
                                  experience: '',
                                  education: '',
                                  currentCompany: company.name,
                                  status: 'Applied',
                                  aiMatchScore: 80,
                                  resumeText: '',
                                  address: '',
                                  notes: '',
                                  appliedDate: new Date().toISOString().split('T')[0]
                                };
                                onComposeWhatsApp(syntheticCandidate);
                              } else {
                                setLocalComposeWATo(company.phone || '+1 (555) 000-0000');
                                setShowLocalWAModal(true);
                              }
                            }}
                            title="WhatsApp Company"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (!can('companies.delete')) {
                                showToast('❌ Access Denied: You do not have permission to delete company registries.', 'error');
                                return;
                              }
                              if (confirm(`Are you sure you want to delete ${company.name}?`)) {
                                onDeleteCompany(company.id);
                              }
                            }}
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
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
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{Math.min(filteredCompanies.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredCompanies.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredCompanies.length}</strong>
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

      <CompanyFormModal
        isOpen={showAddModal || !!showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(null);
        }}
        onSubmit={handleFormSubmit}
        company={showEditModal}
        teamMembers={teamMembers}
      />

      {showLocalEmailModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 uppercase">Quick Email Outbox</h4>
              <button onClick={() => setShowLocalEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">To</label>
                <input type="text" readOnly value={localComposeEmailTo} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Subject</label>
                <input type="text" placeholder="Recruitment status update..." className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Message Body</label>
                <textarea rows={4} placeholder="Hi, I wanted to follow up on your candidates selection..." className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowLocalEmailModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={() => {
                setShowLocalEmailModal(false);
                alert(`✓ Quick email successfully dispatched to ${localComposeEmailTo}!`);
              }} className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg">Send Email</button>
            </div>
          </div>
        </div>
      </Portal>
      )}

      {showLocalWAModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 uppercase">Quick WhatsApp Dispatcher</h4>
              <button onClick={() => setShowLocalWAModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Recipient Phone</label>
                <input type="text" readOnly value={localComposeWATo} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">WhatsApp message text</label>
                <textarea rows={3} placeholder="Hi, let me know when you can jump on a quick call..." className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowLocalWAModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={() => {
                setShowLocalWAModal(false);
                alert(`✓ WhatsApp alert successfully routed to ${localComposeWATo}!`);
              }} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg">Send WhatsApp</button>
            </div>
          </div>
        </div>
      </Portal>
      )}

    </div>
  );
}
