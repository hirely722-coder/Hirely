import React from 'react';
import { useApp } from '@/context/AppContext';
import CopilotView from '@/components/CopilotView';

export default function CopilotPage() {
  const {
    candidates,
    jobs,
    companies,
    tasks,
    templates
  } = useApp();

  return (
    <CopilotView
      candidates={candidates}
      jobs={jobs}
      companies={companies}
      tasks={tasks}
      templates={templates}
    />
  );
}
