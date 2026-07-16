import React from 'react';
import { useApp } from '@/context/AppContext';
import { RecruiterDashboardView } from '@/components/RecruiterDashboardView';

export default function RecruitersPage() {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Syncing active workspace directories...</p>
      </div>
    );
  }

  return <RecruiterDashboardView />;
}
