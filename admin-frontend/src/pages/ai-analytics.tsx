import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Sparkles, RefreshCw, Cpu, DollarSign, Timer, 
  BarChart2, Zap, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminAiAnalytics() {
  const { showToast } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAiAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminApi('/api/superadmin/ai-analytics');
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load AI analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAiAnalytics();
  }, []);

  if (loading || !data) {
    return <div className="p-6 text-center text-slate-400">Loading AI analytics...</div>;
  }

  const kpis = [
    { name: 'Total Requests', value: data.totalRequests, sub: 'Last 30 days', icon: Cpu, color: 'bg-indigo-50 text-indigo-600' },
    { name: 'Consumed Cost', value: `$${parseFloat(data.totalCost).toFixed(4)}`, sub: 'Direct Eden AI charge', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Total Tokens Usage', value: data.totalTokens.toLocaleString(), sub: 'Prompt + Completion', icon: Zap, color: 'bg-amber-50 text-amber-600' },
    { name: 'Avg Latency', value: `${(data.averageResponseTime / 1000).toFixed(2)}s`, sub: 'Server round-trip time', icon: Timer, color: 'bg-blue-50 text-blue-600' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">AI Analytics</h1>
          <p className="text-xs text-slate-500 font-medium">Audit AI usage across Eden AI and ElevenLabs, trace parsing performance, and monitor prompt tokens.</p>
        </div>
        <button 
          onClick={loadAiAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${kpi.color} shrink-0`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">{kpi.sub}</span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.name}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">{kpi.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart & Provider Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Features Distribution Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 font-display mb-1">Consumption by Feature</h3>
          <p className="text-[11px] text-slate-400 font-medium mb-6">Distribution of dispatch requests across modules.</p>

          <div className="space-y-4">
            {Object.entries(data.breakdown).map(([feature, count]: any) => {
              const share = data.totalRequests > 0 ? Math.round((count / data.totalRequests) * 100) : 0;
              return (
                <div key={feature} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>{feature}</span>
                    <span className="font-mono text-slate-400">{count} reqs ({share}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Provider configuration panel */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display mb-1">Provider Config</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-4">Master AI engine models settings.</p>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* Eden AI */}
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-950">Eden AI Engine</p>
                <p className="text-[10px] text-slate-400 font-medium">Google Gemma 2b</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                Active
              </span>
            </div>

            {/* Voice AI */}
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-950">Voice Synthesis</p>
                <p className="text-[10px] text-slate-400 font-medium">ElevenLabs Multilingual v2</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">
                Active
              </span>
            </div>

            {/* LLM Temp */}
            <div className="flex justify-between items-center py-2.5">
              <div>
                <p className="text-xs font-bold text-slate-950">Model Temperature</p>
                <p className="text-[10px] text-slate-400 font-medium">Low (Determinism: 0.1)</p>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                0.10
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3.5 mt-4 flex gap-2.5 text-[10px] font-semibold text-slate-500 leading-normal">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>Success Rate platform-wide is standing at {data.successRate}% within acceptable thresholds.</span>
          </div>
        </div>

      </div>

      {/* Real-time developer transaction logger */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 font-display">System AI Log Stream</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Agency</th>
                <th className="px-6 py-4">Feature Module</th>
                <th className="px-6 py-4">Model Provider</th>
                <th className="px-6 py-4 font-mono">Tokens</th>
                <th className="px-6 py-4">Est. Cost</th>
                <th className="px-6 py-4">Latency</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono font-medium text-[11px] text-slate-600">
              {data.logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-sans font-bold whitespace-nowrap">Agency User</td>
                  <td className="px-6 py-4 text-slate-900 font-sans whitespace-nowrap">{log.feature}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.provider}</td>
                  <td className="px-6 py-4 text-slate-800">{log.tokenUsage || '-'}</td>
                  <td className="px-6 py-4 text-slate-950">${parseFloat(log.cost).toFixed(5)}</td>
                  <td className="px-6 py-4 text-slate-800">{log.responseTimeMs} ms</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.25 rounded text-[9px] font-sans font-bold border ${
                      log.status === 'Success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                        : 'bg-rose-50 text-rose-700 border-rose-100/50'
                    }`}>
                      {log.status === 'Success' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
