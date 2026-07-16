import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '../context/AppContext';
import { 
  Users, UserCheck, Shield, Sliders, Globe, Building2, Briefcase, 
  TrendingUp, Percent, Check, X, Search, ChevronRight, Info,
  Calendar, CheckSquare, Settings, Activity, Trash2, ArrowUpRight, ArrowDownRight,
  AlertTriangle, ShieldAlert, Award, Star, Flame, ChevronUp, ChevronDown
} from 'lucide-react';
import { TeamMember } from '../types';

interface RecruiterMetric {
  recruiterId: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Recruiter' | 'HR Executive' | 'Viewer';
  department?: string;
  designation?: string;
  status: 'Active' | 'Pending' | 'Disabled';
  assignedCompaniesCount: number;
  assignedJobsCount: number;
  pendingTasksCount: number;
  interviewsCount: number;
  placementsCount: number;
  totalAgencyFee: number;
  incentiveRate: number;
  incentivesEarned: number;
}

import { ExportCsvButton } from './ui/ExportCsvButton';
import { ExportColumn } from '../utils/csvExporter';

const recruiterExportColumns: ExportColumn<RecruiterMetric>[] = [
  { header: 'Recruiter Name', key: 'name' },
  { header: 'Email', key: 'email' },
  { header: 'Role', key: 'role' },
  { header: 'Status', key: 'status' },
  { header: 'Assigned Companies', key: 'assignedCompaniesCount' },
  { header: 'Assigned Jobs', key: 'assignedJobsCount' },
  { header: 'Pending Tasks', key: 'pendingTasksCount' },
  { header: 'Interviews Conducted', key: 'interviewsCount' },
  { header: 'Placements', key: 'placementsCount' },
  { header: 'Total Agency Fee (INR)', key: 'totalAgencyFee' },
  { header: 'Incentive Rate', key: 'incentiveRate', transform: (val: any) => `${val}%` },
  { header: 'Incentives Earned (INR)', key: 'incentivesEarned' }
];

export function RecruiterDashboardView() {
  const router = useRouter();
  const { 
    workspace, 
    teamMembers,
    activityLogs,
    showToast,
    handleUpdateTeamMember,
    token
  } = useApp();

  // Metrics Data State
  const [metrics, setMetrics] = useState<RecruiterMetric[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [editingIncentiveId, setEditingIncentiveId] = useState<string | null>(null);
  const [tempIncentiveRate, setTempIncentiveRate] = useState<string>('');

  // Filtering, Sorting, and Capacity State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled' | 'Pending'>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [capacityFilter, setCapacityFilter] = useState<'All' | 'Unassigned' | 'Underutilized' | 'Optimal' | 'Overloaded'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'workload' | 'placements' | 'billings'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper for authenticated fetch calls
  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  // Fetch metrics data
  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const response = await authFetch('/api/recruiters/metrics');
      if (!response.ok) throw new Error('Failed to fetch recruiter metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching recruiter metrics', 'error');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [teamMembers]);

  // Activate / Deactivate Recruiter status
  const handleToggleStatus = async (recruiter: RecruiterMetric) => {
    const nextStatus = recruiter.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const original = teamMembers.find(tm => tm.id === recruiter.recruiterId);
      if (!original) throw new Error('Recruiter profile not found');
      
      const updated: TeamMember = {
        ...original,
        status: nextStatus as 'Active' | 'Disabled'
      };
      await handleUpdateTeamMember(updated);
      showToast(`✓ User ${recruiter.name} status updated to ${nextStatus}!`, 'success');
      fetchMetrics();
    } catch (err: any) {
      showToast(err.message || 'Failed to update recruiter status', 'error');
    }
  };

  // Inline Incentive Rate Saving
  const handleSaveIncentiveRate = async (recruiterId: string) => {
    const rate = parseFloat(tempIncentiveRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showToast('Please enter a valid percentage between 0 and 100.', 'error');
      return;
    }

    try {
      const response = await authFetch(`/api/team_members/${recruiterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incentiveRate: rate })
      });
      
      if (!response.ok) throw new Error('Failed to update incentive rate');
      showToast('✓ Incentive rate updated successfully!', 'success');
      setEditingIncentiveId(null);
      fetchMetrics();
    } catch (err: any) {
      showToast(err.message || 'Error updating incentive rate', 'error');
    }
  };

  // Sort Handlers
  const handleSort = (field: 'name' | 'workload' | 'placements' | 'billings') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Capacity categorization helper
  const getCapacityCategory = (m: RecruiterMetric): 'Unassigned' | 'Underutilized' | 'Optimal' | 'Overloaded' => {
    if (m.assignedJobsCount === 0) return 'Unassigned';
    if (m.assignedJobsCount <= 3) return 'Underutilized';
    if (m.assignedJobsCount <= 7) return 'Optimal';
    return 'Overloaded';
  };

  // Get Last Activity Date
  const getRecruiterLastActivity = (recruiterId: string) => {
    const logs = activityLogs.filter(log => log.userId === recruiterId);
    if (logs.length === 0) return 'No activity';
    const latest = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return new Date(latest.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter roster
  const filteredMetrics = metrics.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.designation && m.designation.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Active' && m.status === 'Active') ||
      (statusFilter === 'Disabled' && m.status === 'Disabled') ||
      (statusFilter === 'Pending' && m.status === 'Pending');

    const matchesRole = 
      roleFilter === 'All' || 
      m.role === roleFilter;

    const matchesCapacity = 
      capacityFilter === 'All' || 
      getCapacityCategory(m) === capacityFilter;

    return matchesSearch && matchesStatus && matchesRole && matchesCapacity;
  });

  // Sort results
  const sortedMetrics = [...filteredMetrics].sort((a, b) => {
    let valA: any = a.name.toLowerCase();
    let valB: any = b.name.toLowerCase();

    if (sortBy === 'workload') {
      valA = a.assignedJobsCount;
      valB = b.assignedJobsCount;
    } else if (sortBy === 'placements') {
      valA = a.placementsCount;
      valB = b.placementsCount;
    } else if (sortBy === 'billings') {
      valA = a.totalAgencyFee;
      valB = b.totalAgencyFee;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Global aggregates
  const totalWorkspaceFee = metrics.reduce((sum, m) => sum + m.totalAgencyFee, 0);
  const totalWorkspacePlacements = metrics.reduce((sum, m) => sum + m.placementsCount, 0);
  const totalWorkspaceIncentives = metrics.reduce((sum, m) => sum + m.incentivesEarned, 0);
  const activeRecruitersCount = metrics.filter(m => m.status === 'Active').length;
  const pendingRecruitersCount = metrics.filter(m => m.status === 'Pending').length;

  // Bottlenecks & Attention Needed calculation
  const unassignedRecruiters = metrics.filter(m => m.status === 'Active' && m.role === 'Recruiter' && m.assignedCompaniesCount === 0 && m.assignedJobsCount === 0);
  const overloadedRecruiters = metrics.filter(m => m.status === 'Active' && m.role === 'Recruiter' && m.assignedJobsCount >= 8);
  const inactiveRecruiters = metrics.filter(m => m.status === 'Active' && m.role === 'Recruiter' && m.interviewsCount === 0 && m.placementsCount === 0);

  // Performance Leaders (Top 3)
  const topPerformers = [...metrics]
    .filter(m => m.status === 'Active' && (m.placementsCount > 0 || m.totalAgencyFee > 0))
    .sort((a, b) => b.placementsCount - a.placementsCount || b.totalAgencyFee - a.totalAgencyFee)
    .slice(0, 3);

  // Recruiter Sourcing Activity logs (Global)
  const getRecruiterLogs = () => {
    return activityLogs.filter((log: any) => {
      return metrics.some(m => m.recruiterId === log.userId);
    }).slice(0, 10);
  };

  // Workload Progress Meter component
  const renderWorkloadMeter = (jobsCount: number) => {
    const pct = Math.min((jobsCount / 10) * 100, 100);
    let color = 'bg-blue-500';
    let text = 'Underutilized';
    let textColor = 'text-blue-600 bg-blue-50/50 border-blue-100/30';

    if (jobsCount === 0) {
      color = 'bg-rose-500';
      text = 'Unassigned';
      textColor = 'text-rose-600 bg-rose-50/50 border-rose-100/30';
    } else if (jobsCount >= 4 && jobsCount <= 7) {
      color = 'bg-emerald-500';
      text = 'Optimal';
      textColor = 'text-emerald-600 bg-emerald-50/50 border-emerald-100/30';
    } else if (jobsCount >= 8) {
      color = 'bg-amber-500';
      text = 'Overloaded';
      textColor = 'text-amber-600 bg-amber-50/50 border-amber-100/30';
    }

    return (
      <div className="space-y-1.5 w-full min-w-[120px]">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <span className={`px-2 py-0.25 rounded-full font-bold uppercase border ${textColor}`}>{text}</span>
          <span className="text-slate-500 font-bold">{jobsCount} Jobs</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in font-sans pb-12">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Recruiter Console</h1>
          <p className="text-xs text-slate-500 mt-1">Workspace operations dashboard. Select a recruiter profile to configure assignments and access rights.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-[10px] font-bold border border-indigo-200/50 bg-indigo-50/40 text-indigo-700 rounded-lg flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <Globe className="h-3.5 w-3.5" />
            Strategy: {workspace?.recruiterAssignmentStrategy?.toUpperCase() || 'GLOBAL'}
          </span>
          <ExportCsvButton
            data={sortedMetrics}
            columns={recruiterExportColumns}
            filename="recruiter_performance_report"
            permission="candidates.export"
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
          />
          <button 
            onClick={fetchMetrics}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors shadow-xs"
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* 2. Unified KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Recruiters',
            val: activeRecruitersCount,
            sub: `${pendingRecruitersCount} pending invitations`,
            icon: Users,
            color: 'text-blue-600 bg-blue-50 border-blue-100'
          },
          {
            label: 'Agency Placements',
            val: totalWorkspacePlacements,
            sub: 'Placed candidates (Joined)',
            icon: UserCheck,
            color: 'text-purple-600 bg-purple-50 border-purple-100'
          },
          {
            label: 'Gross Billings',
            val: `₹${totalWorkspaceFee.toLocaleString()}`,
            sub: 'Total agency fees earned',
            icon: TrendingUp,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
          },
          {
            label: 'Recruiter Payouts',
            val: `₹${totalWorkspaceIncentives.toLocaleString()}`,
            sub: 'Calculated incentives due',
            icon: Percent,
            color: 'text-orange-600 bg-orange-50 border-orange-100'
          }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">{card.label}</h4>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{card.val}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Operations Alerts & Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Operations Warnings Panel */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
              Operations & Bottlenecks Alert
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time indicators identifying recruiters requiring immediate attention.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Unassigned Warning */}
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-500 font-mono uppercase tracking-wider">Unassigned</span>
                <ShieldAlert className="h-4 w-4 text-rose-400" />
              </div>
              <div className="my-2.5">
                <p className="text-2xl font-black font-mono text-slate-950">{unassignedRecruiters.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Recruiters with zero visibility settings.</p>
              </div>
              {unassignedRecruiters.length > 0 ? (
                <div className="text-[9px] text-rose-700 bg-rose-50/50 p-1.5 border border-rose-100/50 rounded font-semibold truncate">
                  Needs Job/Client Assignments!
                </div>
              ) : (
                <div className="text-[9px] text-emerald-700 bg-emerald-50/50 p-1.5 border border-emerald-100/50 rounded font-semibold">
                  ✓ All recruiters mapped!
                </div>
              )}
            </div>

            {/* Overloaded Warning */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-600 font-mono uppercase tracking-wider">Overloaded</span>
                <Flame className="h-4 w-4 text-amber-400" />
              </div>
              <div className="my-2.5">
                <p className="text-2xl font-black font-mono text-slate-950">{overloadedRecruiters.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Recruiters with 8+ assigned jobs.</p>
              </div>
              {overloadedRecruiters.length > 0 ? (
                <div className="text-[9px] text-amber-700 bg-amber-50/50 p-1.5 border border-amber-100/50 rounded font-semibold truncate">
                  High burn-out risk. Balance workloads.
                </div>
              ) : (
                <div className="text-[9px] text-emerald-700 bg-emerald-50/50 p-1.5 border border-emerald-100/50 rounded font-semibold">
                  ✓ Workloads balanced!
                </div>
              )}
            </div>

            {/* Inactive Warning */}
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-600 font-mono uppercase tracking-wider">Zero Activity</span>
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              <div className="my-2.5">
                <p className="text-2xl font-black font-mono text-slate-950">{inactiveRecruiters.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Recruiters with no logged actions.</p>
              </div>
              {inactiveRecruiters.length > 0 ? (
                <div className="text-[9px] text-blue-700 bg-blue-50/50 p-1.5 border border-blue-100/50 rounded font-semibold truncate">
                  No interviews or placements logged.
                </div>
              ) : (
                <div className="text-[9px] text-emerald-700 bg-emerald-50/50 p-1.5 border border-emerald-100/50 rounded font-semibold">
                  ✓ All recruiters active!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Panel */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-indigo-600" />
              Operations Top Performers
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Top-performing recruiters by placements count.</p>
          </div>

          <div className="space-y-3">
            {topPerformers.length === 0 ? (
              <p className="text-center text-slate-400 text-xs font-semibold py-8">
                No recruiter placements logged yet.
              </p>
            ) : (
              topPerformers.map((performer, index) => {
                const badgeColor = index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : index === 1 ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-orange-100 text-orange-700 border-orange-200';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                return (
                  <div key={performer.recruiterId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs border ${badgeColor}`}>
                        {medal}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{performer.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{performer.department || 'Talent Acquisition'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black font-mono text-slate-905">{performer.placementsCount} Placements</p>
                      <p className="text-[9px] text-emerald-600 font-mono font-bold">₹{performer.totalAgencyFee.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 4. Roster List & Activity Timeline */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Clickable Recruiter Roster Table */}
        <div className="xl:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          
          <div>
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Roster</option>
                    <option value="Disabled">Inactive Roster</option>
                    <option value="Pending">Pending Invites</option>
                  </select>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Roles</option>
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="Viewer">Viewer</option>
                  </select>

                  <select
                    value={capacityFilter}
                    onChange={(e) => setCapacityFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Capacities</option>
                    <option value="Unassigned">Unassigned</option>
                    <option value="Underutilized">Under-utilized</option>
                    <option value="Optimal">Optimal</option>
                    <option value="Overloaded">Overloaded</option>
                  </select>
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-3 border-t border-slate-200/40 pt-2 text-[10px] text-slate-400 font-medium">
                <span>Sort by:</span>
                {[
                  { field: 'name', label: 'Name' },
                  { field: 'workload', label: 'Workload' },
                  { field: 'placements', label: 'Placements' },
                  { field: 'billings', label: 'Fees Billings' }
                ].map((item) => {
                  const isCurrent = sortBy === item.field;
                  return (
                    <button
                      key={item.field}
                      onClick={() => handleSort(item.field as any)}
                      className={`flex items-center gap-1 px-2 py-0.75 border rounded-md cursor-pointer transition-colors ${
                        isCurrent 
                          ? 'border-blue-200 bg-blue-50/50 text-blue-700 font-bold' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      {item.label}
                      {isCurrent && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </button>
                  );
                })}
              </div>

            </div>

            {isLoadingMetrics ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-2">
                <div className="h-8 w-8 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Syncing active workspace directories...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/20 border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider text-[10px] font-bold">
                      <th className="p-4">Recruiter Profile</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Workload Capacity</th>
                      <th className="p-4 text-center">Interviews</th>
                      <th className="p-4 text-center">Placements</th>
                      <th className="p-4">Commission</th>
                      <th className="p-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {sortedMetrics.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                          No recruiters match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      sortedMetrics.map(recruiter => {
                        const initials = recruiter.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                        const isEditing = editingIncentiveId === recruiter.recruiterId;
                        const isBypassed = recruiter.role === 'Owner' || recruiter.role === 'Admin';
                        const strategy = workspace?.recruiterAssignmentStrategy || 'global';
                        
                        return (
                          <tr 
                            key={recruiter.recruiterId} 
                            onClick={() => router.push(`/recruiters/${recruiter.recruiterId}`)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            
                            {/* Profile Column */}
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold font-sans text-xs border border-blue-100/50">
                                  {initials}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-slate-900 text-xs">{recruiter.name}</p>
                                    <span className="text-[9px] font-mono font-medium px-1.5 py-0.25 bg-slate-100 text-slate-500 rounded uppercase">{recruiter.role}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[180px]">{recruiter.email}</p>
                                </div>
                              </div>
                            </td>
                            
                            {/* Status Column */}
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleStatus(recruiter)}
                                className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase transition-colors cursor-pointer border ${
                                  recruiter.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                    : recruiter.status === 'Pending'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                                }`}
                                title={recruiter.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                                disabled={recruiter.status === 'Pending'}
                              >
                                {recruiter.status}
                              </button>
                            </td>

                            {/* Workload Column */}
                            <td className="p-4">
                              {isBypassed ? (
                                <div className="space-y-1 w-full min-w-[120px]">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Admin Bypass</span>
                                  <div className="h-1 w-full bg-slate-100 rounded-full" />
                                </div>
                              ) : strategy === 'global' ? (
                                <div className="space-y-1 w-full min-w-[120px]">
                                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider font-mono">Global Access</span>
                                  <div className="h-1 w-full bg-indigo-500/25 rounded-full" />
                                </div>
                              ) : (
                                renderWorkloadMeter(recruiter.assignedJobsCount)
                              )}
                            </td>

                            <td className="p-4 text-center text-slate-900 font-mono font-semibold">{recruiter.interviewsCount}</td>
                            <td className="p-4 text-center text-slate-900 font-mono font-semibold">{recruiter.placementsCount}</td>
                            
                            {/* Commission Column */}
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="text"
                                    value={tempIncentiveRate}
                                    onChange={(e) => setTempIncentiveRate(e.target.value)}
                                    className="w-10 px-1.5 py-0.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono text-[11px]"
                                  />
                                  <button 
                                    onClick={() => handleSaveIncentiveRate(recruiter.recruiterId)}
                                    className="p-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingIncentiveId(null)}
                                    className="p-0.5 bg-slate-50 text-slate-600 border border-slate-100 rounded cursor-pointer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 group">
                                  <span className="text-slate-900 font-mono font-semibold">{recruiter.incentiveRate}%</span>
                                  <span className="text-[10px] text-slate-400 font-normal">₹{recruiter.incentivesEarned.toLocaleString()}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingIncentiveId(recruiter.recruiterId);
                                      setTempIncentiveRate(recruiter.incentiveRate.toString());
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Edit rate"
                                  >
                                    <Percent className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Last Active Column */}
                            <td className="p-4 font-mono text-slate-500 text-[10px] font-bold">
                              {getRecruiterLastActivity(recruiter.recruiterId)}
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer stats bar */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50/30">
            <span>Showing {sortedMetrics.length} of {metrics.length} recruiters in directory.</span>
            <span className="font-mono text-[9px] font-medium tracking-wide uppercase">Click any recruiter profile to view details & permissions</span>
          </div>

        </div>

        {/* Recruiter Activity Logs Timeline */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-blue-600" />
              Sourcing Logs
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Timeline of recent recruiter actions.</p>
          </div>

          <div className="flex-1 my-5 overflow-y-auto space-y-4 max-h-[380px] pr-1">
            {getRecruiterLogs().length === 0 ? (
              <p className="text-center text-slate-400 text-xs font-semibold py-12">
                No recent activity recorded.
              </p>
            ) : (
              getRecruiterLogs().map((log: any) => {
                return (
                  <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0 group">
                    <div className="absolute left-3.5 top-7 bottom-0 w-[1px] bg-slate-150 group-last:hidden" />
                    <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-[10px] font-sans text-slate-500 shadow-2xs">
                      {log.userName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 leading-normal">
                        <span className="font-bold text-slate-950">{log.userName}</span>: {log.description}
                      </p>
                      <p className="text-[9px] text-slate-450 font-mono mt-1 font-semibold">
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-400 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <span>Audit logs capture database modifications immediately.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
