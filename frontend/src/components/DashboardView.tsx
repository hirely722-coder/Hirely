import React from 'react';
import { LayoutDashboard, Users, Briefcase, CheckSquare, Calendar, Building2, Sparkles, Upload, Plus, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { Candidate, Job, Company, Task } from '../types';

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
  // Calculations
  const totalCandidates = candidates.length;
  const activeJobs = jobs.filter(j => j.status === 'Open').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const interviewsToday = tasks.filter(t => t.type === 'Interview' && t.status === 'Pending').length;
  const openPositions = activeJobs; // Same as active jobs in this simplified model

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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Welcome back. Here is a summary of your talent pipeline and pending recruitment activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-medium">
            Active Workspace
          </span>
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
    </div>
  );
}
