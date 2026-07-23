import React, { useState, useEffect } from 'react';
import { 
  Boxes, ShieldCheck, Sparkles, Video, MessageSquare, CheckCircle2, 
  AlertCircle, Lock, Zap, ArrowUpRight, Check
} from 'lucide-react';
import { CustomTheme } from '../../types';
import { supabase } from '../../utils/supabase';

interface SettingsModulesTabProps {
  showToast: (text: string, type: 'success' | 'error') => void;
  activeTheme?: CustomTheme;
}

export function SettingsModulesTab({ showToast, activeTheme }: SettingsModulesTabProps) {
  // WC Module Settings
  const [wcModuleEnabled, setWcModuleEnabled] = useState<boolean>(true);
  const [wcPolicy, setWcPolicy] = useState<'optional' | 'mandatory'>('optional');

  useEffect(() => {
    const storedWcEnabled = localStorage.getItem('hirely_module_wc_enabled');
    const storedWcPolicy = localStorage.getItem('hirely_module_wc_policy');

    if (storedWcEnabled !== null) {
      setWcModuleEnabled(storedWcEnabled === 'true');
    }
    if (storedWcPolicy !== null) {
      setWcPolicy(storedWcPolicy as 'optional' | 'mandatory');
    }

    // Fetch workspace module policy from Supabase
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authToken = session?.access_token || '';
      fetch(`${backendUrl}/api/email-integration/settings`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.modules) {
            setWcModuleEnabled(data.modules.wcEnabled ?? true);
            setWcPolicy(data.modules.wcPolicy || 'optional');
            localStorage.setItem('hirely_module_wc_enabled', String(data.modules.wcEnabled ?? true));
            localStorage.setItem('hirely_module_wc_policy', data.modules.wcPolicy || 'optional');
          }
        })
        .catch(() => {});
    });
  }, []);

  const handleSaveWcSettings = async () => {
    localStorage.setItem('hirely_module_wc_enabled', String(wcModuleEnabled));
    localStorage.setItem('hirely_module_wc_policy', wcPolicy);

    // Save to Supabase PostgreSQL
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || '';
      await fetch(`${backendUrl}/api/email-integration/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          modules: {
            wcEnabled: wcModuleEnabled,
            wcPolicy: wcPolicy
          }
        })
      });
      showToast('✓ White-Label (WC) privacy settings saved to Supabase!', 'success');
    } catch {
      showToast('✓ White-Label (WC) privacy settings saved locally!', 'success');
    }
  };

  const hasCustomLogo = Boolean(activeTheme?.branding?.logoUrl);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-800">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans font-heading">Feature Modules</h3>
            <p className="text-xs text-slate-500">Manage active recruitment modules and agency feature permissions.</p>
          </div>
        </div>
      </div>

      {/* Module 1: White-Label (WC) Candidate Privacy Module */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-gradient-to-br from-rose-50 to-indigo-50 border border-rose-100 rounded-xl text-rose-600 mt-0.5">
              <ShieldCheck className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Candidate White-Label (WC) & Privacy Protection</h4>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> INCLUDED IN PLAN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Automatically mask candidate phone numbers, email addresses, and personal contact details when sending resume presentations to client companies. Includes your custom agency logo or clean agency network header.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input 
              type="checkbox" 
              checked={wcModuleEnabled} 
              onChange={(e) => setWcModuleEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Policy Options & Branding Settings */}
        {wcModuleEnabled && (
          <div className="space-y-4 pt-1 animate-fade-in">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900">Candidate Presentation Policy</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label 
                  onClick={() => setWcPolicy('optional')}
                  className={`p-3.5 border rounded-xl cursor-pointer flex items-start gap-3 transition-all ${
                    wcPolicy === 'optional' 
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="wcPolicy" 
                    checked={wcPolicy === 'optional'} 
                    onChange={() => setWcPolicy('optional')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Flexible Mode (Recruiter Managed)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Recruiters can enable or disable WC contact masking per candidate presentation.</span>
                  </div>
                </label>

                <label 
                  onClick={() => setWcPolicy('mandatory')}
                  className={`p-3.5 border rounded-xl cursor-pointer flex items-start gap-3 transition-all ${
                    wcPolicy === 'mandatory' 
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="wcPolicy" 
                    checked={wcPolicy === 'mandatory'} 
                    onChange={() => setWcPolicy('mandatory')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-rose-600" /> Strict Privacy Policy (Mandatory Lock)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Enforces candidate contact masking across all recruiters with no manual overrides.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Branding Status Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">PDF Watermark Output:</span>
                {hasCustomLogo ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Custom Logo Enabled
                  </span>
                ) : (
                  <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold text-[11px] flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-600" /> Standard Agency Header Active
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">Configure logo in Appearance tab</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveWcSettings}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4" /> Save WC Module Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
