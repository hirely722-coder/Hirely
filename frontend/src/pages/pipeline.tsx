import React from 'react';
import { useApp } from '@/context/AppContext';
import PipelineView from '@/components/PipelineView';

export default function PipelinePage() {
  const { candidates, jobs, handleUpdateCandidateStage, isLoading } = useApp();

  return (
    <PipelineView
      candidates={candidates}
      jobs={jobs}
      onUpdateCandidateStage={handleUpdateCandidateStage}
      isLoading={isLoading}
    />
  );
}
