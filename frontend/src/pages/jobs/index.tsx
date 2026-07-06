import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import JobsView from '@/components/JobsView';

export default function JobsPage() {
  const router = useRouter();
  const {
    jobs,
    companies,
    candidates,
    handleAddJob,
    handleUpdateJob,
    handleDeleteJob,
    handleUpdateCandidate,
    handleUpdateCandidateStage,
    addActivityLog,
    showToast,
    isLoading
  } = useApp();

  const handleSendCandidateList = (jobTitle: string, candidateNames: string[]) => {
    const logDescription = `Dispatched talent portfolio (${candidateNames.join(', ')}) for position ${jobTitle}.`;
    addActivityLog('Candidate', logDescription);
    showToast(`✓ Submitted shortlist of ${candidateNames.length} candidates for ${jobTitle}!`);
  };

  const handleOpenCSVImport = () => {
    router.push('/jobs?import=true&type=jobs');
  };

  return (
    <JobsView
      jobs={jobs}
      companies={companies}
      candidates={candidates}
      isLoading={isLoading}
      onAddJob={handleAddJob}
      onEditJob={handleUpdateJob}
      onDeleteJob={handleDeleteJob}
      onSendCandidateList={handleSendCandidateList}
      onEditCandidate={handleUpdateCandidate}
      onUpdateCandidateStage={handleUpdateCandidateStage}
      onOpenCSVImport={handleOpenCSVImport}
    />
  );
}
