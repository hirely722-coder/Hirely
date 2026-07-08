import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Activity, RefreshCw, Cpu, CheckCircle2, 
  AlertTriangle, ShieldAlert, Sparkles, MessageSquare, 
  CreditCard, Globe, Database, UserCheck
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminFeatureControl() {
  const { showToast } = useApp();
  const [switches, setSwitches] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSwitches = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/feature-control');
      setSwitches(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load switches', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSwitches();
  }, []);

  const handleToggle = async (key: string) => {
    const nextVal = !switches[key];
    const updatedSwitches = { ...switches, [key]: nextVal };
    
    // Optimistic Update
    setSwitches(updatedSwitches);
    
    try {
      setSaving(true);
      await fetchAdminApi('/api/superadmin/feature-control', {
        method: 'POST',
        body: JSON.stringify(updatedSwitches)
      });
      showToast(`✓ Master Feature [${key}] updated successfully!`);
    } catch (err: any) {
      // Revert on error
      setSwitches(switches);
      showToast(err.message || 'Failed to save switches config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !switches) {
    return <div className="p-6 text-center text-slate-400">Loading master switches dashboard...</div>;
  }

  const moduleSwitches = [
    { key: 'enableVoiceAi', name: 'Voice Copilot', desc: 'Allows recruitment teams to conduct automated AI phone screenings.', icon: Sparkles, color: 'text-violet-600 bg-violet-50' },
    { key: 'enableResumeParsing', name: 'AI Resume Parser', desc: 'Converts uploaded candidate PDF/Word resumes to structured JSON profiles.', icon: Cpu, color: 'text-blue-600 bg-blue-50' },
    { key: 'enableWhatsapp', name: 'WhatsApp Campaigns', desc: 'Allows sending direct job invitations and chat outreach templates to candidates.', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'enableStripeCheckout', name: 'Stripe Paywalls', desc: 'Controls platform checkout flows. Disabling bypasses billing limits for all tiers.', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'enableCandidatePortal', name: 'External Candidate Portals', desc: 'Allows candidate access to view application progress and schedules.', icon: Globe, color: 'text-teal-600 bg-teal-50' },
    { key: 'enableBackgroundChecks', name: 'Background Verification', desc: 'Allows recruiters to query verification APIs for candidates.', icon: UserCheck, color: 'text-amber-600 bg-amber-50' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Feature Control Panel</h1>
          <p className="text-xs text-slate-500 font-medium">Turn modules on or off globally across the platform in case of emergency maintenance.</p>
        </div>
        <button 
          onClick={loadSwitches}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Safety Alert Warning */}
      <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-semibold text-amber-700 leading-normal items-start">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Operational Override Zone</p>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">
            Toggling these options updates the master configuration database instantly. If a feature is disabled, recruitment portals attempting to call related API routes will immediately receive an error response.
          </p>
        </div>
      </div>

      {/* Switches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {moduleSwitches.map((m) => {
          const Icon = m.icon;
          const isEnabled = switches[m.key] || false;
          return (
            <div key={m.key} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${m.color} shrink-0 mt-1`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-950 font-display">{m.name}</h3>
                  
                  {/* Premium minimal slide toggle switcher */}
                  <button
                    onClick={() => handleToggle(m.key)}
                    disabled={saving}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none ${
                      isEnabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{m.desc}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.25 rounded text-[8px] font-mono font-bold border ${
                    isEnabled 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' 
                      : 'bg-slate-50 text-slate-500 border-slate-200/40'
                  }`}>
                    {isEnabled ? 'SYSTEM ACTIVE' : 'OFFLINE LOCK'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
