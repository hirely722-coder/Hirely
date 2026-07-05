import React from 'react';
import { CustomTheme } from '../../types';

interface ThemeBrandingTabProps {
  activeTheme: CustomTheme;
  setActiveTheme: React.Dispatch<React.SetStateAction<CustomTheme>>;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function ThemeBrandingTab({
  activeTheme,
  setActiveTheme,
  showToast
}: ThemeBrandingTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Agency Branding</h3>
        <p className="text-xs text-slate-500 mt-1">Configure company logos, favicons, and styling parameters used across outbound PDF reports and template generators.</p>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-4 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-800 font-sans">Vector Logo Customizer</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Vector Logo URL</label>
              <input 
                type="text" 
                value={activeTheme.branding.logoUrl || ''}
                onChange={(e) => setActiveTheme(prev => ({ ...prev, branding: { ...prev.branding, logoUrl: e.target.value } }))}
                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700 focus:outline-none"
                placeholder="e.g. https://apex.agency/logo.svg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Site Favicon URL</label>
              <input 
                type="text" 
                value={activeTheme.branding.faviconUrl || ''}
                onChange={(e) => setActiveTheme(prev => ({ ...prev, branding: { ...prev.branding, faviconUrl: e.target.value } }))}
                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700 focus:outline-none"
                placeholder="e.g. https://apex.agency/favicon.png"
              />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-2xs">
            <div>
              <p className="font-bold text-slate-800 font-sans">Simulate Custom Branding Overlay</p>
              <p className="text-[10px] mt-0.5 text-slate-400 font-sans">Forces custom logo elements on the top header navigation.</p>
            </div>
            <button 
              type="button"
              onClick={() => showToast('✓ Custom white-label branding configurations applied successfully!', 'success')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg font-bold cursor-pointer select-none transition-colors"
            >
              Apply Emblem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
