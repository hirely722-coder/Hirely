import React from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import { RecruiterProfileView } from '@/components/RecruiterProfileView';

export default function RecruiterDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isLoading } = useApp();

  if (isLoading || !id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Syncing active workspace profiles...</p>
      </div>
    );
  }

  return <RecruiterProfileView recruiterId={id as string} />;
}
