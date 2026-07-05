import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import DashboardView from '@/components/DashboardView';

export default function DashboardPage() {
  const router = useRouter();
  const { candidates, jobs, companies, tasks, isLoading } = useApp();

  const handleNavigate = (view: string) => {
    const path = view === 'Dashboard' ? '/dashboard' : `/${view.toLowerCase()}`;
    router.push(path);
  };

  const handleOpenAddModal = () => {
    router.push('/candidates?upload=true');
  };

  return (
    <DashboardView
      candidates={candidates}
      jobs={jobs}
      companies={companies}
      tasks={tasks}
      onNavigate={handleNavigate}
      onOpenAddModal={handleOpenAddModal}
      isLoading={isLoading}
    />
  );
}
