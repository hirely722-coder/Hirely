import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, ChevronLeft, ChevronRight, Eye, Edit2, Copy, Trash2, X, CheckCircle2 
} from 'lucide-react';
import { Job } from '../../types';

interface JobsTableProps {
  jobs: Job[];
  jobCandidates: any[];
  isLoading: boolean;
  onSelectJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onDuplicateJob: (job: Job) => void;
  onToggleStatus: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  canDelete: boolean;
  canEdit: boolean;
}

export default function JobsTable({
  jobs,
  jobCandidates,
  isLoading,
  onSelectJob,
  onEditJob,
  onDuplicateJob,
  onToggleStatus,
  onDeleteJob,
  canDelete,
  canEdit
}: JobsTableProps) {
  // Sort State
  const [sortBy, setSortBy] = useState<'title' | 'company' | 'applications'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleSort = (field: 'title' | 'company' | 'applications') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let valA: any = a.title || '';
      let valB: any = b.title || '';

      if (sortBy === 'company') {
        valA = a.companyName || '';
        valB = b.companyName || '';
      } else if (sortBy === 'applications') {
        valA = jobCandidates.filter(jc => jc.jobId === a.id).length;
        valB = jobCandidates.filter(jc => jc.jobId === b.id).length;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortOrder === 'asc') {
        return valA.toString().localeCompare(valB.toString());
      } else {
        return valB.toString().localeCompare(valA.toString());
      }
    });
  }, [jobs, sortBy, sortOrder, jobCandidates]);

  const paginatedJobs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedJobs.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedJobs, currentPage]);

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage) || 1;

  return (
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
                const linkedRelations = jobCandidates.filter(jc => jc.jobId === job.id);
                const applications = linkedRelations.length;
                const shortlisted = linkedRelations.filter(jc => jc.stage === 'Shortlisted' || jc.stage === 'Screening').length;
                const interviewPool = linkedRelations.filter(jc => jc.stage === 'Interview').length;

                return (
                  <tr 
                    key={job.id}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => onSelectJob(job)}
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
                          {(job.recruiterName || 'Unassigned').split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                        <span className="text-slate-600 font-semibold">{job.recruiterName || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[10px]">2026-06-24</td>
                    
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onSelectJob(job)}
                          title="Open detailed workspace"
                          className="p-1 text-slate-400 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => onEditJob(job)}
                          title="Edit job parameters"
                          className="p-1 text-slate-400 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => onDuplicateJob(job)}
                          title="Duplicate opening"
                          className="p-1 text-slate-400 hover:text-emerald-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => onToggleStatus(job)}
                          title={job.status === 'Open' ? 'Close Opening' : 'Reopen Opening'}
                          className={`p-1 text-slate-400 ${job.status === 'Open' ? 'hover:text-amber-600' : 'hover:text-emerald-600'}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (!canDelete) return;
                            if (confirm(`Are you sure you want to delete ${job.title}?`)) {
                              onDeleteJob(job.id);
                            }
                          }}
                          disabled={!canDelete}
                          title={canDelete ? 'Delete position' : 'Delete position (Disabled)'}
                          className={`p-1 text-slate-400 ${canDelete ? 'hover:text-rose-600' : 'opacity-40 cursor-not-allowed'}`}
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
          Showing <strong>{Math.min(sortedJobs.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(sortedJobs.length, currentPage * itemsPerPage)}</strong> of <strong>{sortedJobs.length}</strong> postings
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
  );
}
