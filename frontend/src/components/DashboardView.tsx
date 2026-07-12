import React, { useState } from 'react';
import { LayoutDashboard, Users, Briefcase, CheckSquare, Calendar, Building2, Sparkles, Upload, Plus, ArrowRight, Clock, ChevronRight, Check, X, ShieldCheck } from 'lucide-react';
import { Candidate, Job, Company, Task } from '../types';
import { useApp } from '../context/AppContext';
import AnimatedModal from './AnimatedModal';

interface DashboardViewProps {
  candidates: Candidate[];
  jobs: Job[];
  companies: Company[];
  tasks: Task[];
  onNavigate: (page: string) => void;
  onOpenAddModal: (type: 'candidate' | 'job' | 'company' | 'resume') => void;
  isLoading?: boolean;
}

export default function DashboardView({
  candidates,
  jobs,
  companies,
  tasks,
  onNavigate,
  onOpenAddModal,
  isLoading = false
}: DashboardViewProps) {
  const { subscriptionPlan, showToast, isTrialActive, getTrialDaysRemaining, user, token, setShowUpgradeSuccess } = useApp();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Calculations
  const totalCandidates = candidates.length;
  const activeJobs = jobs.filter(j => j.status === 'Open').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const interviewsToday = tasks.filter(t => t.type === 'Interview' && t.status === 'Pending').length;
  const openPositions = activeJobs; // Same as active jobs in this simplified model
  const paidDaysRemaining = subscriptionPlan?.renewalDate
    ? Math.max(0, Math.ceil((new Date(subscriptionPlan.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Recent subsets
  const recentCandidates = [...candidates]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 4);

  const recentJobs = [...jobs]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 4);

  const upcomingTasks = tasks
    .filter(t => t.status === 'Pending')
    .slice(0, 4);

  const todayInterviews = tasks
    .filter(t => t.type === 'Interview' && t.status === 'Pending')
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in" id="dashboard-view">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1 font-sans animate-pulse">
              Syncing active workspaces...
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-medium">
              Active Workspace
            </span>
          </div>
        </div>

        {/* Bento loading Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-16 bg-slate-100 rounded" />
                <div className="h-7 w-7 rounded-lg bg-slate-50" />
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <div className="h-7 w-12 bg-slate-200 rounded" />
                <div className="h-3 w-8 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Bento Columns 12-span */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Interviews Skeleton */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-12 h-8 bg-slate-100 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3.5 w-48 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Candidates Skeleton */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
              <div className="px-6 py-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-4 w-36 bg-slate-100 rounded" />
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column (4-cols) Skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="h-4 w-32 bg-slate-200 rounded" />
              </div>
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-slate-200" />
                    <div className="flex-1 h-4 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-view">
      {isTrialActive() && (
        <div className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 rounded-3xl p-5 border border-indigo-400/30 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in mb-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm font-black tracking-wide font-display flex items-center gap-1.5">
                🎉 Welcome to your 7-Day Free Trial
              </h2>
              <p className="text-[11px] text-indigo-100 font-medium mt-0.5 leading-relaxed">
                You currently have FULL, unrestricted access to every Hirely feature including AI Sourcing, parsing, copilot and templates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider font-mono">Trial Ends</div>
              <div className="text-xs font-black font-mono mt-0.5">
                {subscriptionPlan?.trialEndDate ? new Date(subscriptionPlan.trialEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/20 hidden md:block" />
            <div className="text-right">
              <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider font-mono">Time Left</div>
              <div className="text-xs font-black font-mono mt-0.5 text-amber-300">
                {getTrialDaysRemaining()} Days Remaining
              </div>
            </div>
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <span>Upgrade Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Paid Active Plan Banner */}
      {subscriptionPlan && !subscriptionPlan.isTrial && subscriptionPlan.status === 'active' && subscriptionPlan.renewalDate && new Date(subscriptionPlan.renewalDate) >= new Date() && paidDaysRemaining <= 7 && (
        <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-5 border border-emerald-400/30 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in mb-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20">
              <ShieldCheck className="h-5 w-5 text-amber-300 animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm font-black tracking-wide font-display flex items-center gap-1.5 flex-wrap">
                🎉 Active Plan: {subscriptionPlan.slug === 'growth' ? 'PRO RECRUITER (GROWTH)' : subscriptionPlan.name?.toUpperCase() || 'PAID'}
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium mt-0.5 leading-relaxed">
                Your one-month premium plan is active. Once expired, you will need to repurchase the plan to continue using your recruitment portal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider font-mono">Plan Ends</div>
              <div className="text-xs font-black font-mono mt-0.5">
                {new Date(subscriptionPlan.renewalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/20 hidden md:block" />
            <div className="text-right">
              <div className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider font-mono">Time Left</div>
              <div className="text-xs font-black font-mono mt-0.5 text-amber-300">
                {paidDaysRemaining} Days Remaining
              </div>
            </div>
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <span>Renew / Repurchase</span>
            </button>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Welcome back. Here is a summary of your talent pipeline and pending recruitment activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg font-medium">
            Active Workspace
          </span>
          {subscriptionPlan?.slug === 'growth' ? (
            <button
              onClick={() => {
                setShowUpgradeSuccess(true);
                setTimeout(() => {
                  setShowUpgradeSuccess(false);
                }, 5000);
              }}
              className="text-xs font-mono px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all hover:scale-[1.02]"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              Pro Recruiter
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs font-mono px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-medium uppercase">
                {subscriptionPlan?.name || 'Starter'} Plan
              </span>
              <button
                onClick={() => setIsPricingModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="h-3 w-3" />
                <span>Upgrade Plan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Metric Cards - 5-column Bento row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {/* Total Candidates Card */}
        <div 
          onClick={() => onNavigate('Candidates')}
          className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 group shadow-sm"
          id="metric-candidates"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Candidates</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-display">{totalCandidates}</span>
            <span className="text-[10px] text-emerald-600 font-bold font-mono bg-emerald-50 px-1.5 py-0.5 rounded">+12%</span>
          </div>
        </div>

        {/* Active Jobs Card */}
        <div 
          onClick={() => onNavigate('Jobs')}
          className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 group shadow-sm"
          id="metric-jobs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Active Jobs</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-display">{activeJobs}</span>
            <span className="text-[10px] text-indigo-600 font-bold font-mono bg-indigo-50 px-1.5 py-0.5 rounded">Live</span>
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div 
          onClick={() => onNavigate('Tasks')}
          className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 group shadow-sm"
          id="metric-tasks"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pending Tasks</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center transition-colors group-hover:bg-amber-600 group-hover:text-white">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-display">{pendingTasks}</span>
            <span className="text-[10px] text-amber-600 font-bold font-mono bg-amber-50 px-1.5 py-0.5 rounded">Action</span>
          </div>
        </div>

        {/* Interviews Today Card */}
        <div 
          onClick={() => onNavigate('Tasks')}
          className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 group shadow-sm"
          id="metric-interviews"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Interviews Today</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-display">{interviewsToday}</span>
            <span className="text-[10px] text-emerald-600 font-bold font-mono bg-emerald-50 px-1.5 py-0.5 rounded">Today</span>
          </div>
        </div>

        {/* Open Positions Card */}
        <div 
          onClick={() => onNavigate('Jobs')}
          className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 group shadow-sm col-span-2 sm:col-span-1"
          id="metric-positions"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Open Positions</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-display">{openPositions}</span>
            <span className="text-[10px] text-slate-400 font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded">Total</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Bento Columns 12-span */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8-cols): Interviews, Candidates table */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Today's Interviews Bento Panel */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-bold text-slate-900 font-display text-sm">Today's Interviews</h2>
              </div>
              <button 
                onClick={() => onNavigate('Tasks')} 
                className="text-blue-600 hover:text-blue-700 text-xs font-semibold"
              >
                View Calendar
              </button>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {todayInterviews.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No interviews scheduled for today.
                </div>
              ) : (
                todayInterviews.map((interview) => (
                  <div 
                    key={interview.id} 
                    className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onNavigate('Candidates')}
                  >
                    <div className="text-center w-12 border-r pr-4 border-slate-100">
                      <p className="text-xs font-bold text-slate-800 font-mono">09:30</p>
                      <p className="text-[9px] text-slate-400 uppercase font-mono">AM</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{interview.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">Applicant: {interview.candidateName || 'Assigned Candidate'}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-50 text-green-600 text-[9px] font-bold uppercase rounded-md border border-green-100 font-mono">
                      Google Meet
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Candidates Table Bento Panel */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-bold text-slate-900 font-display text-sm">Recent Candidates</h2>
              </div>
              <button 
                onClick={() => onNavigate('Candidates')} 
                className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Key Skills</th>
                    <th className="px-6 py-3 font-semibold">Match score</th>
                    <th className="px-6 py-3 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                        No candidate profiles registered yet.
                      </td>
                    </tr>
                  ) : (
                    recentCandidates.map((candidate) => (
                      <tr 
                        key={candidate.id} 
                        onClick={() => onNavigate('Candidates')}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {candidate.name}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 truncate max-w-[180px]">
                          {(candidate.skills || []).slice(0, 3).join(', ')}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-emerald-600 font-bold font-mono">
                            {candidate.aiMatchScore}% Match
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right pr-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                            candidate.status === 'Applied' ? 'bg-slate-100 text-slate-700' :
                            candidate.status === 'Screening' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            candidate.status === 'Interview' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            candidate.status === 'Selected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {candidate.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Jobs Bento Panel */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <h2 className="font-bold text-slate-900 font-display text-sm">Active Job Postings</h2>
              </div>
              <button 
                onClick={() => onNavigate('Jobs')} 
                className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="divide-y divide-slate-100 bg-white">
              {recentJobs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active job postings.
                </div>
              ) : (
                recentJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onNavigate('Jobs')}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{job.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{job.companyName} • {job.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-mono">
                        {job.applicationsCount} Applicants
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* Right Column (4-cols): Quick Actions, Pending Tasks */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Bento Card: Quick Actions */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-900 font-display text-sm mb-1">Quick Actions</h2>
            <p className="text-xs text-slate-400 mb-4">Accelerate your workflow with instant creation modules.</p>
            
            <div className="space-y-2.5">
              <button 
                onClick={() => onOpenAddModal('candidate')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Add New Candidate</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button 
                onClick={() => onOpenAddModal('resume')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Upload New Resume</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button 
                onClick={() => onOpenAddModal('job')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Add New Job</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button 
                onClick={() => onOpenAddModal('company')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Add Corporate Client</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </button>

              <button 
                onClick={() => onNavigate('Copilot')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-850 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-blue-400 shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">Open AI Copilot</span>
                </div>
                <span className="text-[9px] bg-blue-500 px-1.5 py-0.5 rounded text-white font-bold font-mono uppercase tracking-wide">
                  PRO
                </span>
              </button>
            </div>
          </section>

          {/* Bento Card: Pending Tasks */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 font-display text-sm">Upcoming Tasks</h2>
              <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2 py-0.5 rounded-md font-mono">
                {pendingTasks} PENDING
              </span>
            </div>
            
            <div className="space-y-3.5">
              {upcomingTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  All tasks are up to date!
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-start gap-3 hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                    onClick={() => onNavigate('Tasks')}
                  >
                    <div className="mt-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        task.priority === 'High' ? 'bg-rose-500 ring-4 ring-rose-50' : 
                        task.priority === 'Medium' ? 'bg-amber-400 ring-4 ring-amber-50' : 
                        'bg-slate-300 ring-4 ring-slate-100'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{task.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Due: {task.dueDate}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {isTrialActive() && (
            <section className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-3xl shadow-lg text-white space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Current Plan</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 border border-indigo-400/20 text-indigo-300">
                  <Sparkles className="h-3 w-3" /> Free Trial
                </span>
              </div>
              
              <div>
                <h4 className="text-xs font-black font-display text-slate-100">7-Day Free Trial</h4>
                <div className="mt-2 space-y-1">
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                    <div 
                      className="bg-indigo-500 h-full rounded-full" 
                      style={{ width: `${(getTrialDaysRemaining() / 7) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-1">
                    <span>{getTrialDaysRemaining()} days remaining</span>
                    <span>7 days total</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-1.5 text-[10px] text-slate-300 font-medium">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span>All Features Enabled</span></li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span>Unlimited Candidates & Jobs</span></li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> <span>AI Matching & Copilot Sourcing</span></li>
              </ul>

              <button
                onClick={() => setIsPricingModalOpen(true)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-extrabold tracking-wide uppercase transition-all shadow-md cursor-pointer text-center"
              >
                Upgrade Anytime
              </button>
            </section>
          )}

          {/* Recruiter Smart Tip Bento block */}
          <section className="bg-blue-50/40 border border-blue-100/60 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-blue-900 font-display flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Recruiter AI tip
            </h3>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              Did you know you can upload PDF or plaintext resumes? The **AI parser** extracts fields instantly, matches applicant skills, and provides instant recommendation scores.
            </p>
          </section>

        </div>
      </div>

      {/* Pricing / Plan Upgrade Modal */}
      <AnimatedModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)}>
        {(animate) => (
          <div 
            className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-3xl w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Select License Tier</h4>
              <button 
                type="button" 
                onClick={() => setIsPricingModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-400 font-medium">Upgrade your workspace to unlock advanced recruitment capabilities.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Starter Plan Card */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Starter</span>
                      {subscriptionPlan?.slug !== 'growth' && (
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">ACTIVE</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 font-sans">Free Trial</h4>
                    <div className="mt-2 mb-4 flex items-baseline">
                      <span className="text-xl font-bold text-slate-900">₹0</span>
                      <span className="text-xs text-slate-400 font-semibold font-sans ml-1">/ forever</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 font-sans border-t border-slate-200/60 pt-4">
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-slate-400 shrink-0" /> <span>3 Active Jobs</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-slate-400 shrink-0" /> <span>100 Candidates Database</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-slate-400 shrink-0" /> <span>2 GB Storage Limit</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-slate-400 shrink-0" /> <span>10 AI parser requests/mo</span></li>
                      <li className="flex items-center gap-2 text-slate-400"><X className="h-4 w-4 text-slate-300 shrink-0" /> <span>No advanced analytics</span></li>
                      <li className="flex items-center gap-2 text-slate-400"><X className="h-4 w-4 text-slate-300 shrink-0" /> <span>No WhatsApp integrations</span></li>
                    </ul>
                  </div>
                  <button
                    disabled
                    className="w-full mt-6 py-2.5 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold font-sans cursor-not-allowed"
                  >
                    {subscriptionPlan?.slug !== 'growth' ? 'Current Plan' : 'Trial Version'}
                  </button>
                </div>

                {/* Growth Plan Card */}
                <div className="bg-gradient-to-b from-blue-50/50 to-white border-2 border-blue-500 rounded-xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">POPULAR</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-blue-600 uppercase font-bold tracking-wider">Pro Recruiter</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 font-sans">Growth Plan</h4>
                    <div className="mt-2 mb-4 flex items-baseline">
                      <span className="text-xl font-bold text-slate-900">₹2,000</span>
                      <span className="text-xs text-slate-400 font-semibold font-sans ml-1">/ month</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-600 font-sans border-t border-blue-100 pt-4">
                      <li className="flex items-center gap-2 font-semibold text-slate-800"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span>Unlimited Active Jobs</span></li>
                      <li className="flex items-center gap-2 font-semibold text-slate-800"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span>Unlimited Candidates Database</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span>20 GB Storage Space</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span>500 AI Parser requests/mo</span></li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span>AI Voice commands & search helper</span></li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (isUpgrading) return;
                      setIsUpgrading(true);
                      try {
                        // 1. Fetch order details from Hono Backend
                        const orderRes = await fetch('/api/payments/create-order', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ planSlug: 'growth' }),
                        });

                        if (!orderRes.ok) {
                          const errData = await orderRes.json();
                          throw new Error(errData.error || 'Failed to create order');
                        }
                        const orderData = await orderRes.json();

                        // 2. Configure Razorpay Standard Modal options
                        const options = {
                          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TCVTzrCeGHT0sg',
                          amount: orderData.amount,
                          currency: orderData.currency,
                          name: "Hirely AI Platform",
                          description: "Upgrade License to GROWTH",
                          order_id: orderData.orderId,
                          handler: async function (response: any) {
                            // 3. Send payment details to verification endpoint
                            const verifyRes = await fetch('/api/payments/verify-payment', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpaySignature: response.razorpay_signature,
                                planSlug: 'growth'
                              })
                            });

                            if (verifyRes.ok) {
                              setShowUpgradeSuccess(true);
                              setIsPricingModalOpen(false);
                              setTimeout(() => {
                                window.location.reload();
                              }, 3500);
                            } else {
                              const errData = await verifyRes.json();
                              showToast(errData.error || 'Payment verification failed', 'error');
                            }
                          },
                          prefill: {
                            email: user?.email || '',
                            name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
                          },
                          theme: {
                            color: "#3161f5"
                          },
                          modal: {
                            ondismiss: function () {
                              showToast('Upgrade cancelled by user.', 'error');
                            }
                          }
                        };

                        const rzp = new (window as any).Razorpay(options);
                        rzp.on('payment.failed', function (resp: any) {
                          showToast(`Payment failed: ${resp.error.description}`, 'error');
                        });
                        rzp.open();
                      } catch (err: any) {
                        console.error(err);
                        showToast(err.message || 'An unexpected error occurred.', 'error');
                      } finally {
                        setIsUpgrading(false);
                      }
                    }}
                    disabled={isUpgrading}
                    className={`w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-all shadow-2xs flex items-center justify-center gap-2 ${
                      isUpgrading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUpgrading ? 'Launching Checkout...' : subscriptionPlan?.slug === 'growth' ? 'Repurchase / Renew Plan' : 'Upgrade Workspace to Pro'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

    </div>
  );
}
