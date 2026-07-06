import React from 'react';
import { CompanyActivity } from '../../utils/companyMockData';

interface CompanyActivityTabProps {
  activities: CompanyActivity[];
}

export function CompanyActivityTab({ activities }: CompanyActivityTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-slate-900 font-sans">Client Activity Timeline</h3>
      
      <div className="relative border-l border-slate-200 pl-5 ml-1.5 space-y-6">
        {activities.map(act => (
          <div key={act.id} className="relative flex items-start gap-4">
            <div className="absolute -left-[24.5px] top-1.5 h-2 w-2 rounded-full bg-slate-350 ring-4 ring-white" />
            <div className="text-xs">
              <p className="font-bold text-slate-900 font-sans">{act.type}</p>
              <p className="text-slate-655 mt-1 font-sans">{act.description}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Performed by {act.user} on {act.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
