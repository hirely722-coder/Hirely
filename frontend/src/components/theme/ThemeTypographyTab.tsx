import React from 'react';
import { CustomTheme } from '../../types';

interface ThemeTypographyTabProps {
  activeTheme: CustomTheme;
  handleTypographyChange: (key: keyof CustomTheme['typography'], value: any) => void;
}

export function ThemeTypographyTab({
  activeTheme,
  handleTypographyChange
}: ThemeTypographyTabProps) {
  const fontsList = ['Inter', 'Space Grotesk', 'JetBrains Mono', 'Poppins', 'Roboto', 'Open Sans', 'Nunito'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Typography Settings</h3>
        <p className="text-xs text-slate-500 mt-1">Specify font layout weights, pairings, and sizes. Custom families are pulled dynamically in the background.</p>
      </div>

      <div className="space-y-5">
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs shadow-2xs">
          
          {/* Font Family selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Font Family</label>
            <select
              value={activeTheme.typography.fontFamily}
              onChange={(e) => handleTypographyChange('fontFamily', e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700 focus:outline-none"
            >
              {fontsList.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 block mt-1 font-sans">Supports active loading for Poppins, Inter, Roboto etc.</span>
          </div>

          {/* Font Size Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Base Sizing</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['sm', 'md', 'lg', 'xl'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleTypographyChange('fontSize', sz)}
                  className={`py-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    activeTheme.typography.fontSize === sz 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sz.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1 font-sans">Small (13px) up to Extra Large (16px).</span>
          </div>

          {/* Font Weight Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Default Weight</label>
            <select
              value={activeTheme.typography.fontWeight}
              onChange={(e) => handleTypographyChange('fontWeight', e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700 focus:outline-none"
            >
              <option value="normal">Normal / Regular (400)</option>
              <option value="medium">Medium Weight (500)</option>
              <option value="semibold">Semi-Bold (600)</option>
              <option value="bold">Display Bold (700)</option>
            </select>
            <span className="text-[10px] text-slate-400 block mt-1 font-sans">Baseline density for descriptions.</span>
          </div>

        </div>

        {/* Typography live card preview */}
        <div className="border border-slate-150 rounded-2xl p-5 space-y-4 shadow-2xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Sample Layout Preview</span>
          <div 
            className="p-5 border border-slate-100 rounded-xl space-y-3"
            style={{ 
              fontFamily: `"${activeTheme.typography.fontFamily}", sans-serif`,
            }}
          >
            <h4 className="text-lg font-black text-slate-900 leading-snug">Empowering candidate pipelines with intelligence.</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam id finibus purus. Pellentesque gravida convallis nunc at molestie. Praesent sed lacus eget ligula molestie hendrerit.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-slate-400 font-mono">
              <span>JetBrains Mono Accent</span>
              <span>·</span>
              <span>Inter Body Label</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
