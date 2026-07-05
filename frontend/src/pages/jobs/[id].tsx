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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
