import React from 'react';
import Head from 'next/head';
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
    <>
      <Head>
        <title>Hirly Forge - AI Recruiter Engine</title>
      </Head>
      <CopilotView
        candidates={candidates}
        jobs={jobs}
        companies={companies}
        tasks={tasks}
        templates={templates}
      />
    </>
  );
}
