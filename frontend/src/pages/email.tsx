import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import { EmailView } from '@/components/EmailView';

export default function EmailPage() {
  const router = useRouter();
  const appCtx = useApp() as any;
  const { candidates, jobs, companies, showToast, setSelectedCandidate } = appCtx;

  const handleNavigateToSettings = (tab?: string) => {
    router.push('/settings?tab=email_integration');
  };

  return (
    <EmailView
      candidates={candidates}
      jobs={jobs}
      companies={companies}
      showToast={showToast}
      onNavigateToSettings={handleNavigateToSettings}
      setSelectedCandidate={setSelectedCandidate}
    />
  );
}
