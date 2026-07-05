import React, { useState, useMemo } from 'react';
import { 
  Building2, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Eye, Edit2, Trash2, Mail, Phone, MessageSquare, Plus, X, Briefcase, 
  Download, Globe, UserCheck, Upload 
} from 'lucide-react';
import { Company, Job, Candidate } from '../types';
import CompanyDetailsPage from './company/CompanyDetailsPage';
import Portal from './Portal';
import { SearchableDropdown } from './SearchableDropdown';

interface CompaniesViewProps {
  companies: Company[];
  jobs: Job[];
  candidates: Candidate[];
  onAddCompany: (company: Company) => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (id: string) => void;
  onNavigateToJobs: (companyId: string) => void;
  onOpenAddJobModal: (companyId: string) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onAddJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onComposeEmail?: (candidate: Candidate) => void;
  onComposeWhatsApp?: (candidate: Candidate) => void;
  onOpenCSVImport?: (type: 'companies' | 'jobs' | 'candidates') => void;
  isLoading?: boolean;
}

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

  // Form states for modal
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRecContact, setFormRecContact] = useState('Sarah Jenkins');
  const [formIndustry, setFormIndustry] = useState('');
  const [formCompanySize, setFormCompanySize] = useState<Company['companySize']>('11-50');
  const [formFoundedYear, setFormFoundedYear] = useState('');
  const [formTier, setFormTier] = useState<Company['tier']>('Tier 3');
  const [formLinkedInUrl, setFormLinkedInUrl] = useState('');

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

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const newCompany: Company = {
      id: 'c_' + Date.now(),
      name: formName,
      contactPerson: formContact,
      openJobs: 0,
      status: formStatus,
      email: formEmail,
      phone: formPhone,
      website: formWebsite || 'https://example.com',
      address: formAddress || 'HQ: San Francisco, California',
      notes: formNotes || 'Onboarded partner client.',
      recContact: formRecContact,
      industry: formIndustry,
      companySize: formCompanySize,
      foundedYear: formFoundedYear,
      tier: formTier,
      linkedInUrl: formLinkedInUrl
    };

    onAddCompany(newCompany);
    resetForm();
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || !formName) return;

    const updated: Company = {
      ...showEditModal,
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
      linkedInUrl: formLinkedInUrl
    };

    onEditCompany(updated);
    resetForm();
    setShowEditModal(null);
  };

  const startEdit = (company: Company) => {
    setFormName(company.name);
    setFormContact(company.contactPerson);
    setFormStatus(company.status);
    setFormEmail(company.email);
    setFormPhone(company.phone || '');
    setFormWebsite(company.website || '');
    setFormAddress(company.address || '');
    setFormNotes(company.notes || '');
    setFormRecContact(company.recContact || 'Sarah Jenkins');
    setFormIndustry(company.industry || '');
    setFormCompanySize(company.companySize || '11-50');
    setFormFoundedYear(company.foundedYear || '');
    setFormTier(company.tier || 'Tier 3');
    setFormLinkedInUrl(company.linkedInUrl || '');
    setShowEditModal(company);
  };

  const startAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormContact('');
    setFormStatus('Active');
    setFormEmail('');
    setFormPhone('');
    setFormWebsite('');
    setFormAddress('');
    setFormNotes('');
    setFormRecContact('Sarah Jenkins');
    setFormIndustry('');
    setFormCompanySize('11-50');
    setFormFoundedYear('');
    setFormTier('Tier 3');
    setFormLinkedInUrl('');
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Company Name,Contact Person,Email,Status,Recruiter Contact"].join(",") + "\n"
      + companies.map(c => `"${c.name}","${c.contactPerson}","${c.email}","${c.status}","${c.recContact}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "companies_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render drilldown detailed workspace if focused
  if (selectedCompany) {
    return (
      <CompanyDetailsPage 
        company={selectedCompany}
        onBack={() => setFocusedCompanyId(null)}
        jobs={jobs}
        candidates={candidates}
        onEditCompany={onEditCompany}
        onEditCandidate={onEditCandidate}
        onAddJob={onAddJob}
        onEditJob={onEditJob}
        onDeleteJob={onDeleteJob}
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
              onClick={() => onOpenCSVImport('companies')}
              className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-xs"
            >
              <Upload className="h-4 w-4 text-slate-400" />
              Import CSV/Excel
            </button>
          )}
          <button 
            onClick={handleExport}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-xs"
          >
            <Download className="h-4 w-4 text-slate-400" />
            Export CSV
          </button>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
          
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
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

            <button
              type="button"
              onClick={() => setShowFiltersPanel(prev => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                showFiltersPanel 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Advanced Filters
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
                          {company.recContact || 'Sarah Jenkins'}
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
                            onClick={() => onDeleteCompany(company.id)}
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

      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xs font-bold text-slate-950 font-sans uppercase flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-500" />
                Add New Corporate Partner
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Name *</label>
                  <input
                    type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="Stripe, Vercel, Retool..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Contact Person *</label>
                  <input
                    type="text" required value={formContact} onChange={(e) => setFormContact(e.target.value)}
                    placeholder="E.g., Jane Miller"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formStatus} onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="Active">Active Partner</option>
                    <option value="Inactive">Inactive Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Billing Email</label>
                  <input
                    type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="hr@company.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 012-4411"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Website URL</label>
                  <input
                    type="text" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">HQ Address</label>
                  <input
                    type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Industry</label>
                  <input
                    type="text" value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)}
                    placeholder="E.g., SaaS, Fintech, AI"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Size</label>
                  <select
                    value={formCompanySize} onChange={(e: any) => setFormCompanySize(e.target.value)}
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
                    type="text" value={formFoundedYear} onChange={(e) => setFormFoundedYear(e.target.value)}
                    placeholder="E.g., 2018"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Partnership Tier</label>
                  <select
                    value={formTier} onChange={(e: any) => setFormTier(e.target.value)}
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
                    type="text" value={formLinkedInUrl} onChange={(e) => setFormLinkedInUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Register Partner
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
            <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xs font-bold text-slate-950 font-sans uppercase flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-500" />
                Edit Registry: {showEditModal.name}
              </h2>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Name *</label>
                  <input
                    type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Contact Person *</label>
                  <input
                    type="text" required value={formContact} onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formStatus} onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 font-medium"
                  >
                    <option value="Active">Active Partner</option>
                    <option value="Inactive">Inactive Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Billing Email</label>
                  <input
                    type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Website URL</label>
                  <input
                    type="text" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">HQ Address</label>
                  <input
                    type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Industry</label>
                  <input
                    type="text" value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)}
                    placeholder="E.g., SaaS, Fintech, AI"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Size</label>
                  <select
                    value={formCompanySize} onChange={(e: any) => setFormCompanySize(e.target.value)}
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
                    type="text" value={formFoundedYear} onChange={(e) => setFormFoundedYear(e.target.value)}
                    placeholder="E.g., 2018"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Partnership Tier</label>
                  <select
                    value={formTier} onChange={(e: any) => setFormTier(e.target.value)}
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
                    type="text" value={formLinkedInUrl} onChange={(e) => setFormLinkedInUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button" onClick={() => setShowEditModal(null)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

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
