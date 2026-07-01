import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import CompanyDetailsPage from '@/components/company/CompanyDetailsPage';

export default function CompanyDetailsPageWrapper() {
  const router = useRouter();
  const { id } = router.query;
  const {
    companies,
    jobs,
    candidates,
    handleUpdateCompany,
    handleUpdateCandidate,
    handleAddJob,
    handleUpdateJob,
    handleDeleteJob,
    setEmailComposeCandidate,
    setEmailComposePreselectedJob,
    setWhatsappComposeCandidate,
    setWhatsappComposePreselectedJob,
    isLoading
  } = useApp();

  // Find active company
  const company = companies.find(c => c.id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-bold text-slate-800">Company Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The company with ID "{id}" could not be found.</p>
        <button 
          onClick={() => router.push('/companies')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Back to Companies
        </button>
      </div>
    );
  }

  return (
    <CompanyDetailsPage
      company={company}
      onBack={() => router.push('/companies')}
      jobs={jobs}
      candidates={candidates}
      onEditCompany={handleUpdateCompany}
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
    />
  );
}
