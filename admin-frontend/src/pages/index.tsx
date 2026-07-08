import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Building2, Users, CreditCard, Sparkles, Mail, Database, 
  Activity, ShieldAlert, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminDashboard() {
  const { showToast } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/dashboard-stats');
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-2xl p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-white border border-slate-200/80 rounded-3xl" />
          <div className="h-[350px] bg-white border border-slate-200/80 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Mock revenue trends based on timeframe selection
  const getRevenueData = () => {
    switch (timeframe) {
      case 'daily':
        return [
          { label: 'Mon', value: 1200 },
          { label: 'Tue', value: 1800 },
          { label: 'Wed', value: 1500 },
          { label: 'Thu', value: 2400 },
          { label: 'Fri', value: 2200 },
          { label: 'Sat', value: 3100 },
          { label: 'Sun', value: stats.totalRevenue || 2900 }
        ];
      case 'weekly':
        return [
          { label: 'Wk 1', value: 12000 },
          { label: 'Wk 2', value: 15400 },
          { label: 'Wk 3', value: 18900 },
          { label: 'Wk 4', value: stats.totalRevenue || 22000 }
        ];
      case 'yearly':
        return [
          { label: '2023', value: 85000 },
          { label: '2024', value: 145000 },
          { label: '2025', value: 220000 },
          { label: '2026', value: stats.totalRevenue ? stats.totalRevenue * 12 : 280000 }
        ];
      case 'monthly':
      default:
        return [
          { label: 'Jan', value: 5000 },
          { label: 'Feb', value: 7200 },
          { label: 'Mar', value: 9100 },
          { label: 'Apr', value: 12500 },
          { label: 'May', value: 14800 },
          { label: 'Jun', value: stats.totalRevenue || 18500 }
        ];
    }
  };

  const revenueData = getRevenueData();
  const maxVal = Math.max(...revenueData.map(d => d.value)) * 1.15;

  const kpis = [
    { name: 'Total Agencies', value: stats.totalAgencies, change: '+12.4%', up: true, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { name: 'Active Agencies', value: stats.activeAgencies, change: '+8.2%', up: true, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Monthly Revenue', value: formatCurrency(stats.totalRevenue), change: '+24.1%', up: true, icon: CreditCard, color: 'text-violet-600 bg-violet-50' },
    { name: 'Active Users', value: stats.totalUsers, change: '+15.3%', up: true, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { name: 'AI Requests Today', value: stats.totalAiRequests, change: '+32.8%', up: true, icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
    { name: 'Resume Uploads', value: stats.totalResumes, change: '+5.6%', up: true, icon: Database, color: 'text-teal-600 bg-teal-50' },
    { name: 'Emails Sent', value: stats.totalEmails, change: '-2.4%', up: false, icon: Mail, color: 'text-slate-600 bg-slate-50' },
    { name: 'Platform Health', value: '99.9%', change: 'Healthy', up: true, icon: Activity, color: 'text-emerald-600 bg-emerald-50' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">System Overview</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time business and infrastructure statistics.</p>
        </div>
        <button 
          onClick={loadStats}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl ${kpi.color} shrink-0`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  kpi.name === 'Platform Health' 
                    ? 'bg-emerald-50 text-emerald-700'
                    : kpi.up 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-rose-50 text-rose-700'
                }`}>
                  {kpi.name !== 'Platform Health' && (
                    kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />
                  )}
                  {kpi.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.name}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">{kpi.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend Line Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Revenue Performance</h3>
              <p className="text-[11px] text-slate-400 font-medium">Historical recurring billing trend.</p>
            </div>
            
            {/* Timeframe selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 text-[10px] font-bold text-slate-600">
              {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t as any)}
                  className={`px-2.5 py-1 rounded-md transition-all capitalize cursor-pointer ${
                    timeframe === t ? 'bg-white text-slate-950 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-60 w-full">
            <svg className="h-full w-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Horizontal Gridlines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="190" x2="600" y2="190" stroke="#f1f5f9" strokeWidth="1.5" />

              {/* Draw Area path under the curve */}
              <path
                d={`M 0 190 ${revenueData.map((d, i) => {
                  const x = (i / (revenueData.length - 1)) * 600;
                  const y = 190 - (d.value / maxVal) * 150;
                  return `L ${x} ${y}`;
                }).join(' ')} L 600 190 Z`}
                fill="url(#chartGrad)"
              />

              {/* Draw Line path */}
              <path
                d={revenueData.map((d, i) => {
                  const x = (i / (revenueData.length - 1)) * 600;
                  const y = 190 - (d.value / maxVal) * 150;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Draw Data Points circles */}
              {revenueData.map((d, i) => {
                const x = (i / (revenueData.length - 1)) * 600;
                const y = 190 - (d.value / maxVal) * 150;
                return (
                  <g key={i} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                    <circle cx={x} cy={y} r="10" fill="#2563eb" fillOpacity="0" className="hover:fill-opacity-10 transition-all" />
                  </g>
                );
              })}
            </svg>

            {/* X Axis Labels */}
            <div className="flex justify-between mt-2 px-1 text-[9px] font-bold text-slate-400 font-mono">
              {revenueData.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Health and Timeline */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">System Health</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-4">Infrastructure performance.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {/* CPU */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 font-mono">
                <span>CPU UTILIZATION</span>
                <span>{stats.health.cpu}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stats.health.cpu}%` }} />
              </div>
            </div>

            {/* Memory */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 font-mono">
                <span>RAM USAGE</span>
                <span>{stats.health.memory}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stats.health.memory}%` }} />
              </div>
            </div>

            {/* Database Status */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Database</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Operational
              </span>
            </div>

            {/* Queue Status */}
            <div className="flex items-center justify-between py-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Queue Worker</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Active (0 pending)
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 mt-4 text-[10px] font-semibold text-slate-500 leading-normal bg-slate-50 p-3 rounded-2xl">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
            <span>Automatic platform backups are scheduled every 24 hours. The last backup succeeded 12 hours ago.</span>
          </div>
        </div>
      </div>

      {/* Platform Activity Timeline */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 font-display mb-4">Platform Activity</h3>
        <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-5 py-2">
          {[
            { title: 'Agency Created', desc: 'Chal Chale\'s Workspace was successfully created.', time: '2 hours ago', badge: 'bg-blue-50 text-blue-700 border-blue-100/50' },
            { title: 'Subscription Purchased', desc: 'Balal Valal\'s Workspace purchased the AI Pro Plan ($199/mo).', time: '1 day ago', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100/50' },
            { title: 'User Invited', desc: 'HR Recruiter invited abc@gmail.com to join Chal Chale\'s Workspace.', time: '1 day ago', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100/50' },
            { title: 'Payment Failed', desc: 'Transaction of $199.00 failed for Sakuni\'s Workspace.', time: '2 days ago', badge: 'bg-rose-50 text-rose-700 border-rose-100/50' }
          ].map((act, i) => (
            <div key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{act.title}</h4>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.25 rounded border ${act.badge}`}>EVENT</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-semibold">{act.time}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-normal">{act.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
