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
      <div className="space-y-6 animate-pulse p-6">
        <div className="flex justify-between items-center pb-4">
          <div className="space-y-2">
            <div className="h-6 w-36 bg-slate-200 rounded" />
            <div className="h-3.5 w-64 bg-slate-100 rounded" />
          </div>
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="h-64 bg-slate-100 rounded-2xl" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="h-48 bg-slate-100 rounded-2xl" />
            <div className="h-48 bg-slate-100 rounded-2xl" />
          </div>
        </div>
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
