import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import CompaniesView from '@/components/CompaniesView';
import { Company } from '@/types';

export default function CompaniesPage() {
  const router = useRouter();
  const {
    companies,
    jobs,
    candidates,
    handleAddCompany,
    handleUpdateCompany,
    handleDeleteCompany,
    handleUpdateCandidate,
    handleAddJob,
    handleUpdateJob,
    handleDeleteJob,
    setEmailComposeCandidate,
    setEmailComposePreselectedJob,
    setWhatsappComposeCandidate,
    setWhatsappComposePreselectedJob
  } = useApp();

  const handleOpenCSVImport = () => {
    // In our Layout we have the CSV modal. We can trigger it by a query param or direct method if exposed.
    // Let's pass a query param or set a local event. Or let's trigger it by router.push('/companies?import=true')
    // Wait, let's just push to query param. Or, we can trigger it via a router query.
    router.push('/companies?import=true');
  };

  return (
    <CompaniesView
      companies={companies}
      jobs={jobs}
      candidates={candidates}
      onAddCompany={handleAddCompany}
      onEditCompany={handleUpdateCompany}
      onDeleteCompany={handleDeleteCompany}
      onNavigateToJobs={(cId) => router.push(`/jobs?companyId=${cId}`)}
      onOpenAddJobModal={(cId) => router.push(`/jobs?companyId=${cId}&add=true`)}
      onEditCandidate={handleUpdateCandidate}
      onAddJob={handleAddJob}
      onEditJob={handleUpdateJob}
      onDeleteJob={handleDeleteJob}
      onComposeEmail={(c) => {
        setEmailComposeCandidate(c);
        setEmailComposePreselectedJob(null);
      }}
      onComposeWhatsApp={(c) => {
        setWhatsappComposeCandidate(c);
        setWhatsappComposePreselectedJob(null);
      }}
      onOpenCSVImport={() => handleOpenCSVImport()}
    />
  );
}
