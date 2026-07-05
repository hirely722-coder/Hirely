import React from 'react';
import { Plus, Trash } from 'lucide-react';
import { Job } from '../../types';

interface CompanyJobsTabProps {
  filteredJobs: Job[];
  setShowAddJobModal: React.Dispatch<React.SetStateAction<boolean>>;
  onEditJob: (job: Job) => void;
  onAddJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  showLocalToast: (text: string, type: 'success' | 'error') => void;
}

export function CompanyJobsTab({
  filteredJobs,
  setShowAddJobModal,
  onEditJob,
  onAddJob,
  onDeleteJob,
  showLocalToast
}: CompanyJobsTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 font-sans">Client Vacancies ({filteredJobs.length})</h3>
        <button 
          onClick={() => setShowAddJobModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Job
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase">
              <th className="p-4 font-bold">Job Title</th>
              <th className="p-4 font-bold">Location</th>
              <th className="p-4 font-bold">Experience</th>
              <th className="p-4 font-bold text-center">Salary Range</th>
              <th className="p-4 font-bold text-center">Status</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  No jobs registered matching the search query.
                </td>
              </tr>
            ) : (
              filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900 font-sans">{job.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {job.requiredSkills.map(skill => (
                        <span key={skill} className="px-1.5 py-0.25 bg-slate-100 text-[9px] text-slate-500 rounded font-mono border border-slate-200/40">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 font-sans">{job.location}</td>
                  <td className="p-4 text-slate-500 font-mono text-[10px]">{job.experience}</td>
                  <td className="p-4 text-center font-mono text-blue-600 font-bold">{job.salary}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      job.status === 'Open' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => {
                          onEditJob({ ...job, status: job.status === 'Open' ? 'Closed' : 'Open' });
                          showLocalToast(`✓ Vacancy status modified!`, 'success');
                        }}
                        className="px-2 py-1 text-[10px] border border-slate-200 text-slate-600 rounded-md hover:border-blue-500 hover:text-blue-600 bg-white font-semibold cursor-pointer shadow-2xs"
                      >
                        {job.status === 'Open' ? 'Close Job' : 'Open Job'}
                      </button>
                      <button 
                        onClick={() => {
                          const dup: Job = { ...job, id: `job_dup_${Date.now()}`, title: `${job.title} (Duplicate)` };
                          onAddJob(dup);
                          showLocalToast(`✓ Duplicated job opening!`, 'success');
                        }}
                        className="px-2 py-1 text-[10px] border border-slate-200 text-slate-600 rounded-md hover:border-blue-500 hover:text-blue-600 bg-white font-semibold cursor-pointer shadow-2xs"
                      >
                        Duplicate
                      </button>
                      <button 
                        onClick={() => {
                          onDeleteJob(job.id);
                          showLocalToast(`✓ Deleted job opening.`, 'success');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-650 rounded cursor-pointer"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
