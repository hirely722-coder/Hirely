import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sliders, Globe, Building2, Briefcase, Shield } from 'lucide-react';

export function RecruiterManagementTab() {
  const { workspace, handleUpdateWorkspace } = useApp();

  const handleStrategyChange = async (strategy: 'global' | 'company' | 'job' | 'hybrid') => {
    if (!workspace) return;
    const updated = {
      ...workspace,
      recruiterAssignmentStrategy: strategy
    };
    await handleUpdateWorkspace(updated);
  };

  const workspaceStrategy = workspace?.recruiterAssignmentStrategy || 'global';

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in font-sans">
      
      {/* Strategy Control Panel */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-blue-600" />
            Recruiter Assignment Sourcing Policy
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure how recruiter profiles are scoped across client accounts and jobs. Changing this policy immediately alters candidate pipeline visibility for recruiters without affecting administrative roles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              id: 'global',
              label: 'Global Sourcing (Default)',
              desc: 'Recruiters can view and search all candidates, jobs, and client accounts across the workspace.',
              icon: Globe,
              color: 'text-blue-500 bg-blue-50'
            },
            {
              id: 'company',
              label: 'Company-based Sourcing',
              desc: 'Recruiters only see client accounts explicitly assigned to them, and all jobs/candidates under those clients.',
              icon: Building2,
              color: 'text-purple-500 bg-purple-50'
            },
            {
              id: 'job',
              label: 'Job-based Sourcing',
              desc: 'Recruiters are restricted strictly to explicitly assigned jobs and their candidate pipelines.',
              icon: Briefcase,
              color: 'text-orange-500 bg-orange-50'
            },
            {
              id: 'hybrid',
              label: 'Hybrid Sourcing model',
              desc: 'Combined access: recruiters can see both assigned client companies and explicitly assigned job pipelines.',
              icon: Shield,
              color: 'text-emerald-500 bg-emerald-50'
            }
          ].map(item => {
            const Icon = item.icon;
            const isSelected = workspaceStrategy === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleStrategyChange(item.id as any)}
                className={`p-4 border rounded-2xl text-left transition-all hover:bg-slate-50 relative flex items-start gap-3.5 cursor-pointer group ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/10 shadow-xs' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${item.color} group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    {item.label}
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workload Limits Visibility Panel */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-indigo-600" />
            Recruiter Workload Limits Visibility
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure whether individual recruiters can view their capacity utilization gauges, warning alerts, and maximum workload limits in their workspace profiles.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-slate-50/30">
          <div>
            <h4 className="text-xs font-semibold text-slate-900">Show Workload Limits to Recruiters</h4>
            <p className="text-[10px] text-slate-450 mt-0.5 font-medium">Toggle to hide or show capacity indicators on recruiter-side profiles.</p>
          </div>
          <button
            onClick={async () => {
              if (!workspace) return;
              const updated = {
                ...workspace,
                showWorkloadLimitToRecruiters: workspace.showWorkloadLimitToRecruiters === false ? true : false
              };
              await handleUpdateWorkspace(updated);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              workspace?.showWorkloadLimitToRecruiters !== false
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {workspace?.showWorkloadLimitToRecruiters !== false ? 'Enabled (Visible)' : 'Disabled (Hidden)'}
          </button>
        </div>
      </div>

    </div>
  );
}
