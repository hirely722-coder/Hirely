import React, { useState } from 'react';
import { 
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Mail, Phone, MessageSquare, Edit2, Trash2, Settings, X, MapPin, Briefcase
} from 'lucide-react';
import { Candidate, Job } from '../types';
import { SearchableDropdown } from './SearchableDropdown';

interface CandidatesListViewProps {
  filteredCandidates: Candidate[];
  paginatedCandidates: Candidate[];
  visibleColumns: string[];
  setVisibleColumns: (cols: string[]) => void;
  showColumnCustomizer: boolean;
  setShowColumnCustomizer: React.Dispatch<React.SetStateAction<boolean>>;
  customFieldDefinitions: any[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  itemsPerPage: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  showFiltersPanel: boolean;
  setShowFiltersPanel: React.Dispatch<React.SetStateAction<boolean>>;
  designationFilter: string;
  setDesignationFilter: (d: string) => void;
  genderFilter: string;
  setGenderFilter: (g: string) => void;
  cityFilter: string;
  setCityFilter: (c: string) => void;
  salaryFilter: string;
  setSalaryFilter: (s: string) => void;
  educationFilter: string;
  setEducationFilter: (e: string) => void;
  experienceFilter: string;
  setExperienceFilter: (e: string) => void;
  scoreFilter: string;
  setScoreFilter: (s: string) => void;
  skillsCountFilter: string;
  setSkillsCountFilter: (c: string) => void;
  resumeAttachedFilter: string;
  setResumeAttachedFilter: (r: string) => void;
  designationsList: string[];
  citiesList: string[];
  gendersList: string[];
  salariesList: string[];
  educationsList: string[];
  experiencesList: string[];
  customFieldFilters: Record<string, string>;
  setCustomFieldFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSort: (field: 'name' | 'score' | 'experience') => void;
  setSelectedCandidate: (cand: Candidate | null) => void;
  onComposeEmail: (cand: Candidate) => void;
  onComposeWhatsApp: (cand: Candidate) => void;
  startEdit: (cand: Candidate) => void;
  onDeleteCandidate: (id: string) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
  jobs: Job[];
}

export function CandidatesListView({
  filteredCandidates,
  paginatedCandidates,
  visibleColumns,
  setVisibleColumns,
  jobs,
  showColumnCustomizer,
  setShowColumnCustomizer,
  customFieldDefinitions,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  showFiltersPanel,
  setShowFiltersPanel,
  designationFilter,
  setDesignationFilter,
  genderFilter,
  setGenderFilter,
  cityFilter,
  setCityFilter,
  salaryFilter,
  setSalaryFilter,
  educationFilter,
  setEducationFilter,
  experienceFilter,
  setExperienceFilter,
  scoreFilter,
  setScoreFilter,
  skillsCountFilter,
  setSkillsCountFilter,
  resumeAttachedFilter,
  setResumeAttachedFilter,
  customFieldFilters,
  setCustomFieldFilters,
  designationsList,
  citiesList,
  gendersList,
  salariesList,
  educationsList,
  experiencesList,
  handleSort,
  setSelectedCandidate,
  onComposeEmail,
  onComposeWhatsApp,
  startEdit,
  onDeleteCandidate,
  showToast
}: CandidatesListViewProps) {
  const [assigningCandidateId, setAssigningCandidateId] = useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters & search bars */}
      <div className="space-y-3 bg-white p-4 border border-slate-200/80 rounded-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, company, designation, or key skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-white font-sans text-slate-700 font-medium cursor-pointer"
            >
              <option value="All">All Candidates</option>
              <option value="Pool">🧑‍💼 Talent Pool</option>
              <option value="Applied">Applied</option>
              <option value="Screening">Screening</option>
              <option value="Interview">Interview</option>
              <option value="Selected">Selected</option>
              <option value="Offer Sent">Offer Sent</option>
              <option value="Joined">Joined</option>
            </select>

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
              {(() => {
                const activeCustomFiltersCount = Object.values(customFieldFilters || {}).filter(f => f && f !== 'All' && f !== '').length;
                const standardFiltersCount = [designationFilter, genderFilter, cityFilter, salaryFilter, educationFilter, experienceFilter, scoreFilter, skillsCountFilter, resumeAttachedFilter].filter(f => f !== 'All').length;
                const totalFiltersCount = standardFiltersCount + activeCustomFiltersCount;
                return totalFiltersCount > 0 ? (
                  <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                    {totalFiltersCount}
                  </span>
                ) : null;
              })()}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnCustomizer(prev => !prev)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                  showColumnCustomizer
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                Columns
              </button>

              {showColumnCustomizer && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 z-50 text-slate-800 text-xs animate-scale-up space-y-3 font-sans">
                  <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>Show/Hide Columns</span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                      {visibleColumns.length} Active
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Standard Fields</span>
                    <div className="space-y-1">
                      {[
                        { key: 'name', label: 'Candidate Name' },
                        { key: 'contact', label: 'Contact Details' },
                        { key: 'experience', label: 'Experience' },
                        { key: 'currentCompany', label: 'Current Company' },
                        { key: 'status', label: 'Pipeline Stage' }
                      ].map(col => {
                        const isChecked = visibleColumns.includes(col.key);
                        return (
                          <label key={col.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-900 transition-colors font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let newCols = [...visibleColumns];
                                if (isChecked) {
                                  newCols = newCols.filter(k => k !== col.key);
                                } else {
                                  newCols.push(col.key);
                                }
                                setVisibleColumns(newCols);
                                localStorage.setItem('hirely_candidate_columns', JSON.stringify(newCols));
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {customFieldDefinitions.length > 0 && (
                    <div className="space-y-1.5 border-t border-slate-100 pt-2">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Dynamic Custom Fields</span>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {customFieldDefinitions.map(def => {
                          const isChecked = visibleColumns.includes(def.key);
                          return (
                            <label key={def.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-900 transition-colors font-medium text-slate-700">
                              <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    let newCols = [...visibleColumns];
                                    if (isChecked) {
                                      newCols = newCols.filter(k => k !== def.key);
                                    } else {
                                      newCols.push(def.key);
                                    }
                                    setVisibleColumns(newCols);
                                    localStorage.setItem('hirely_candidate_columns', JSON.stringify(newCols));
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              <span className="truncate max-w-[170px]">{def.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced filters collapsible block */}
        {showFiltersPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl animate-fade-in text-xs mt-2">
            <SearchableDropdown
              label="Designation"
              options={designationsList}
              value={designationFilter}
              onChange={setDesignationFilter}
              placeholder="Search designations..."
            />

            <SearchableDropdown
              label="Gender"
              options={gendersList}
              value={genderFilter}
              onChange={setGenderFilter}
              placeholder="Search genders..."
            />

            <SearchableDropdown
              label="City / Location"
              options={citiesList}
              value={cityFilter}
              onChange={setCityFilter}
              placeholder="Search locations..."
            />

            <SearchableDropdown
              label="Expected Salary"
              options={salariesList}
              value={salaryFilter}
              onChange={setSalaryFilter}
              placeholder="Search salary..."
            />

            <SearchableDropdown
              label="Education Level"
              options={educationsList}
              value={educationFilter}
              onChange={setEducationFilter}
              placeholder="Search education..."
            />

            <SearchableDropdown
              label="Experience"
              options={experiencesList}
              value={experienceFilter}
              onChange={setExperienceFilter}
              placeholder="Search experience..."
            />

            <SearchableDropdown
              label="AI Match Score"
              options={['All', 'Excellent (90%+)', 'Strong (80%-89%)', 'Good (70%-79%)', 'Fair (Below 70%)']}
              value={scoreFilter}
              onChange={setScoreFilter}
              placeholder="Search scores..."
            />

            <SearchableDropdown
              label="Tech Skills Count"
              options={['All', '1-3 Skills', '4-6 Skills', '7+ Skills']}
              value={skillsCountFilter}
              onChange={setSkillsCountFilter}
            />

            <SearchableDropdown
              label="Resume Attached"
              options={['All', 'With Resume', 'No Resume']}
              value={resumeAttachedFilter}
              onChange={setResumeAttachedFilter}
            />

            {customFieldDefinitions.map((def) => {
              if (def.type === 'dropdown') {
                return (
                  <SearchableDropdown
                    key={def.key}
                    label={def.name}
                    options={['All', ...(def.options || [])]}
                    value={customFieldFilters[def.key] || 'All'}
                    onChange={(val) => setCustomFieldFilters(prev => ({ ...prev, [def.key]: val }))}
                    placeholder={`Search ${def.name.toLowerCase()}...`}
                  />
                );
              } else if (def.type === 'boolean') {
                return (
                  <SearchableDropdown
                    key={def.key}
                    label={def.name}
                    options={['All', 'Yes', 'No']}
                    value={customFieldFilters[def.key] || 'All'}
                    onChange={(val) => setCustomFieldFilters(prev => ({ ...prev, [def.key]: val }))}
                  />
                );
              } else {
                return (
                  <div key={def.key} className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">{def.name}</label>
                    <input
                      type="text"
                      placeholder={`Search ${def.name}...`}
                      value={customFieldFilters[def.key] || ''}
                      onChange={(e) => setCustomFieldFilters(prev => ({ ...prev, [def.key]: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                    />
                  </div>
                );
              }
            })}

            <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-5 flex justify-end gap-2 pt-2 border-t border-slate-200/50 mt-1">
              <button
                type="button"
                onClick={() => {
                  setDesignationFilter('All');
                  setGenderFilter('All');
                  setCityFilter('All');
                  setSalaryFilter('All');
                  setEducationFilter('All');
                  setExperienceFilter('All');
                  setScoreFilter('All');
                  setSkillsCountFilter('All');
                  setResumeAttachedFilter('All');
                  setStatusFilter('All');
                  setCustomFieldFilters({});
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

      {/* Candidates Full Width Grid Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-mono text-slate-400 uppercase">
                {visibleColumns.includes('name') && (
                  <th 
                    onClick={() => handleSort('name')}
                    className="p-4 font-medium cursor-pointer hover:bg-slate-100/50 hover:text-slate-700"
                  >
                    <div className="flex items-center gap-1">
                      Candidate Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('contact') && (
                  <th className="p-4 font-medium">Contact</th>
                )}
                {visibleColumns.includes('experience') && (
                  <th 
                    onClick={() => handleSort('experience')}
                    className="p-4 font-medium cursor-pointer hover:bg-slate-100/50 hover:text-slate-700"
                  >
                    <div className="flex items-center gap-1">
                      Experience
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('currentCompany') && (
                  <th className="p-4 font-medium">Current Company</th>
                )}
                {visibleColumns.includes('status') && (
                  <th className="p-4 font-medium">Pipeline Stage</th>
                )}

                {customFieldDefinitions.map(def => {
                  if (visibleColumns.includes(def.key)) {
                    return (
                      <th key={def.key} className="p-4 font-medium text-left truncate max-w-[120px]" title={def.name}>
                        {def.name}
                      </th>
                    );
                  }
                  return null;
                })}
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-slate-400 italic">
                    No candidates matched the current search or filters.
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((candidate) => {
                  return (
                    <tr 
                      key={candidate.id} 
                      onClick={() => setSelectedCandidate(candidate)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      {visibleColumns.includes('name') && (
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 font-sans shadow-2xs">
                              {candidate.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors font-sans">{candidate.name}</div>
                              {candidate.designation && (
                                <p className="text-[10px] text-blue-600 font-semibold mt-0.5 font-sans">{candidate.designation}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('contact') && (
                        <td className="p-4 text-slate-500">
                          <div>{candidate.email}</div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">{candidate.phone}</div>
                        </td>
                      )}
                      {visibleColumns.includes('experience') && (
                        <td className="p-4 text-slate-600 font-mono font-medium">
                          {candidate.experience}
                        </td>
                      )}
                      {visibleColumns.includes('currentCompany') && (
                        <td className="p-4 text-slate-600">
                          <div className="font-semibold text-xs text-slate-700">{candidate.currentCompany}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                            {candidate.city && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {candidate.city}
                              </span>
                            )}
                            {candidate.expectedSalary && (
                              <span className="font-mono text-[9px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.25 rounded font-semibold shrink-0">
                                {candidate.expectedSalary}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium ${
                            candidate.status === 'Pool' ? 'bg-slate-50 text-slate-600 border border-slate-200/80 font-bold' :
                            candidate.status === 'Applied' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                            candidate.status === 'Screening' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            candidate.status === 'Shortlisted' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            candidate.status === 'Interview' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            candidate.status === 'Selected' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            candidate.status === 'Offer Sent' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {candidate.status === 'Pool' ? 'Talent Pool' : candidate.status}
                          </span>
                        </td>
                      )}

                      {customFieldDefinitions.map(def => {
                        if (visibleColumns.includes(def.key)) {
                          const val = candidate.customFields?.[def.key];
                          let displayVal = '';
                          if (typeof val === 'boolean') {
                            displayVal = val ? 'Yes' : 'No';
                          } else {
                            displayVal = String(val ?? '');
                          }
                          return (
                            <td key={def.key} className="p-4 text-left font-semibold text-xs text-slate-700 max-w-[120px] truncate animate-fade-in" title={displayVal}>
                              {displayVal ? (
                                <span className="font-mono text-[9px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  {displayVal}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-sans font-normal">-</span>
                              )}
                            </td>
                          );
                        }
                        return null;
                      })}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {assigningCandidateId === candidate.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <select
                              onChange={async (e) => {
                                const jobId = e.target.value;
                                if (!jobId) return;
                                try {
                                  const { supabase: client } = await import('../utils/supabase');
                                  const { data: { session } } = await client.auth.getSession();
                                  const token = session?.access_token;
                                  const res = await fetch('/api/job-candidates', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify({ jobId, candidateId: candidate.id, stage: 'Applied' }),
                                  });
                                  if (res.ok) {
                                    showToast(`✓ Added ${candidate.name} to job pipeline!`, 'success');
                                  } else {
                                    const errRes = await res.json();
                                    showToast(errRes.error || 'Failed to assign candidate', 'error');
                                  }
                                } catch (err) {
                                  console.error(err);
                                  showToast('Failed to assign candidate to job', 'error');
                                } finally {
                                  setAssigningCandidateId(null);
                                }
                              }}
                              className="text-[10px] border border-slate-200 rounded px-1.5 py-1 bg-white font-medium focus:outline-none cursor-pointer w-32"
                            >
                              <option value="">Select Job...</option>
                              {jobs.filter(j => j.status === 'Open').map(j => (
                                <option key={j.id} value={j.id}>{j.title}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => setAssigningCandidateId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {candidate.status === 'Pool' && (
                              <button 
                                onClick={() => setAssigningCandidateId(candidate.id)}
                                title="Add to Job Pipeline"
                                className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                              >
                                <Briefcase className="h-4 w-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => onComposeEmail(candidate)}
                              title="Email Candidate"
                              className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => onComposeWhatsApp(candidate)}
                              title="WhatsApp Message"
                              className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => startEdit(candidate)}
                              title="Edit Profile"
                              className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`Delete candidate ${candidate.name} from the ATS database?`)) {
                                  onDeleteCandidate(candidate.id);
                                  showToast('✓ Candidate deleted successfully.', 'success');
                                }
                              }}
                              title="Delete Profile"
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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
            Showing <strong>{Math.min(filteredCandidates.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredCandidates.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredCandidates.length}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
