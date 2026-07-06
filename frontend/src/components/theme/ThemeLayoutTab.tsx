import React from 'react';
import { CustomTheme } from '../../types';

interface ThemeLayoutTabProps {
  activeTheme: CustomTheme;
  handleLayoutChange: (key: keyof CustomTheme['layout'], value: any) => void;
}

export function ThemeLayoutTab({
  activeTheme,
  handleLayoutChange
}: ThemeLayoutTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Layout Paddings & spacing</h3>
        <p className="text-xs text-slate-500 mt-1">Fine-tune container curvatures, dense compact margins, transitions, and shadow elements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        
        {/* Slider: Border Radius */}
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Corner Curvature (Radius)</label>
            <span className="font-mono font-bold text-slate-700 bg-white border px-1.5 py-0.5 rounded">{activeTheme.layout.borderRadius}px</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="24" 
            value={activeTheme.layout.borderRadius}
            onChange={(e) => handleLayoutChange('borderRadius', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase">
            <span>0px (Sharp)</span>
            <span>12px (Rounded)</span>
            <span>24px (Pill/Organic)</span>
          </div>
        </div>

        {/* Padding density: Compact vs Comfortable */}
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5 shadow-2xs">
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Interface Density</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'compact', label: 'Compact Mode', desc: 'Saves 35% spatial room. Dense text cells.' },
              { id: 'comfortable', label: 'Comfortable', desc: 'Generous padding spacing. Editorial style.' }
            ].map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleLayoutChange('density', d.id)}
                className={`p-3 border text-left rounded-xl transition-all cursor-pointer ${
                  activeTheme.layout.density === d.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-medium'
                }`}
              >
                <p className="text-xs">{d.label}</p>
                <p className={`text-[9px] mt-0.5 font-normal ${activeTheme.layout.density === d.id ? 'text-blue-100' : 'text-slate-400'}`}>{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Style Selection */}
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5 shadow-2xs">
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Lateral Control bar (Sidebar Theme)</label>
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
            {[
              { id: 'light', label: 'Standard Light' },
              { id: 'dark', label: 'Obsidian Dark' },
              { id: 'colored', label: 'Corporate Accent' },
              { id: 'transparent', label: 'Glass Transparent' },
              { id: 'gradient', label: 'Brand Gradient' }
            ].map(styleOpt => (
              <button
                key={styleOpt.id}
                type="button"
                onClick={() => handleLayoutChange('sidebarStyle', styleOpt.id)}
                className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                  activeTheme.layout.sidebarStyle === styleOpt.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {styleOpt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card Shadow Sizing */}
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5 shadow-2xs">
          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Card Shadow Elevators</label>
          <div className="grid grid-cols-5 gap-1 text-[9px] font-bold">
            {[
              { id: 'none', label: 'None' },
              { id: 'flat', label: 'Flat' },
              { id: 'soft', label: 'Soft' },
              { id: 'elevated', label: 'Elevated' },
              { id: 'deep', label: 'Deep Shadow' }
            ].map(sh => (
              <button
                key={sh.id}
                type="button"
                onClick={() => handleLayoutChange('cardShadow', sh.id)}
                className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                  activeTheme.layout.cardShadow === sh.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sh.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animation transition speed selector */}
        <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-3 md:col-span-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Hover Transition Speeds</label>
            <span className="font-mono text-[10px] text-slate-500 font-bold uppercase">{activeTheme.layout.animationSpeed}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 font-bold">
            {[
              { id: 'none', label: 'Instant (0ms)', desc: 'Fastest click rate' },
              { id: 'fast', label: 'Snappy (100ms)', desc: 'Responsive triggers' },
              { id: 'medium', label: 'Standard (200ms)', desc: 'Balanced aesthetics' },
              { id: 'smooth', label: 'Immersive (350ms)', desc: 'Eased animations' }
            ].map(spd => (
              <button
                key={spd.id}
                type="button"
                onClick={() => handleLayoutChange('animationSpeed', spd.id)}
                className={`p-2 border text-left rounded-xl transition-all cursor-pointer ${
                  activeTheme.layout.animationSpeed === spd.id 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="text-[11px]">{spd.label}</p>
                <p className={`text-[8px] font-medium mt-0.5 ${activeTheme.layout.animationSpeed === spd.id ? 'text-blue-100' : 'text-slate-400'}`}>{spd.desc}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
