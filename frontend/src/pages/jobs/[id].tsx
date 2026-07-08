import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import JobDetailsPage from '@/components/job/JobDetailsPage';

export default function JobDetailsPageWrapper() {
  const router = useRouter();
  const { id } = router.query;
  const {
    companies,
    jobs,
    candidates,
    handleUpdateJob,
    handleDeleteJob,
    handleUpdateCandidate,
    handleUpdateCandidateStage,
    isLoading
  } = useApp();

  const job = jobs.find(j => j.id === id);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="flex justify-between items-center pb-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="h-3.5 w-72 bg-slate-100 rounded" />
          </div>
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="flex gap-4 border-b border-slate-200 pb-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 w-16 bg-slate-100 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="h-48 bg-slate-100 rounded-2xl" />
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-bold text-slate-800">Job Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The job with ID "{id}" could not be found.</p>
        <button 
          onClick={() => router.push('/jobs')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <JobDetailsPage
      job={job}
      companies={companies}
      candidates={candidates}
      onBack={() => router.push('/jobs')}
      onEditJob={handleUpdateJob}
      onDeleteJob={handleDeleteJob}
      onEditCandidate={handleUpdateCandidate}
      onUpdateCandidateStage={handleUpdateCandidateStage}
    />
  );
}
