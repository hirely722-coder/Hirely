import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { CustomTheme } from '../../types';

interface ThemeColorsTabProps {
  activeTheme: CustomTheme;
  handleColorChange: (key: keyof CustomTheme['colors'], value: string) => void;
  calculateContrast: (hex1: string, hex2: string) => number;
  getContrastStatus: (ratio: number) => { label: string; bg: string; desc: string };
}

export function ThemeColorsTab({
  activeTheme,
  handleColorChange,
  calculateContrast,
  getContrastStatus
}: ThemeColorsTabProps) {
  const primaryVsBgContrast = calculateContrast(activeTheme.colors.primary, activeTheme.colors.background);
  const textVsBgContrast = calculateContrast(activeTheme.colors.textColor, activeTheme.colors.cardBackground);
  const btnTextVsBtnColor = calculateContrast('#ffffff', activeTheme.colors.buttonColor);

  const colorsList = [
    { key: 'primary', label: 'Primary Brand Color', desc: 'Used for main buttons, primary text, and highlighted assets.' },
    { key: 'secondary', label: 'Secondary Theme', desc: 'Alternate color used for secondary highlights and hovers.' },
    { key: 'accent', label: 'Accent Highlight', desc: 'Provides active soft backdrops and border emphasis.' },
    { key: 'background', label: 'App Background', desc: 'Main canvas backdrop color (App-wide canvas).' },
    { key: 'sidebarBackground', label: 'Sidebar Background', desc: 'Applied directly as the lateral control panel base.' },
    { key: 'navbarBackground', label: 'Header Navigation Bar', desc: 'App-wide top navigation bar background.' },
    { key: 'cardBackground', label: 'Card & Container Panels', desc: 'Containers, dashboards, tables, and popup modal wrappers.' },
    { key: 'textColor', label: 'Primary Label text', desc: 'Standard header lettering, dialog text, and table cells.' },
    { key: 'secondaryText', label: 'Secondary / Subtitles', desc: 'Applied to footnotes, metadata, dates, and instructions.' },
    { key: 'borderColor', label: 'Grid Borders & Dividers', desc: 'Borders on panels, inputs, and separating layout headers.' },
    { key: 'success', label: 'Success / Completed', desc: 'Used for hired badges, completed pipelines, and green alerts.' },
    { key: 'warning', label: 'Warning / Idle', desc: 'For pending stages, intermediate states, and alerts.' },
    { key: 'error', label: 'Error / Cancelled', desc: 'For deleted candidates, failures, and red elements.' },
    { key: 'info', label: 'Info Alerts', desc: 'Highlights system tooltips and informational boxes.' },
    { key: 'buttonColor', label: 'Button Backdrop', desc: 'Applied to active button backgrounds.' },
    { key: 'buttonHoverColor', label: 'Button Hover Color', desc: 'Applied to button background on hover.' },
    { key: 'linkColor', label: 'Hyperlinks', desc: 'Underlined anchor tags and profile triggers.' },
    { key: 'hoverColor', label: 'Interactive Hovers', desc: 'Hover feedback color on lists and labels.' },
    { key: 'selectionColor', label: 'Text Selection BG', desc: 'Highlight color when user drags to select letters.' },
    { key: 'focusRing', label: 'Focus Rings', desc: 'Outline indicator highlighting active input cells.' },
    { key: 'progressBars', label: 'Progress Indicators', desc: 'Applied to completion indicators and meters.' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Corporate Color Customizer</h3>
        <p className="text-xs text-slate-500 mt-1">Personalize the brand attributes. Every modification is rendered live across components in real-time.</p>
      </div>

      {/* Subsections of color parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5 pt-1">
        {colorsList.map(colorConfig => (
          <div key={colorConfig.key} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl space-y-2 text-xs shadow-2xs">
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 font-sans truncate">{colorConfig.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{colorConfig.desc}</span>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-2xs shrink-0 cursor-pointer">
                <input 
                  type="color" 
                  value={(activeTheme.colors[colorConfig.key as keyof CustomTheme['colors']] as string) || '#ffffff'}
                  onChange={(e) => handleColorChange(colorConfig.key as keyof CustomTheme['colors'], e.target.value)}
                  className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer scale-125"
                />
              </div>
              <input 
                type="text" 
                value={(activeTheme.colors[colorConfig.key as keyof CustomTheme['colors']] as string) || ''}
                onChange={(e) => handleColorChange(colorConfig.key as keyof CustomTheme['colors'], e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 font-mono text-slate-700 focus:outline-none"
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Accessibility checking results */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 shadow-inner">
        <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1 font-bold text-slate-900">
          <ShieldAlert className="h-4 w-4 text-blue-600 animate-pulse" />
          WCAG 2.1 Contrast verification audit
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">Contrast is calculated between layered components to prevent visual exhaustion and maintain readability compliance standards.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          
          {/* Primary Text vs Background */}
          <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 font-sans">Text vs Card Background</span>
              <span className="font-mono text-slate-500 text-[10px]">{textVsBgContrast.toFixed(2)}:1</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getContrastStatus(textVsBgContrast).bg}`}>
                {getContrastStatus(textVsBgContrast).label}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">{getContrastStatus(textVsBgContrast).desc}</span>
            </div>
          </div>

          {/* Primary vs Canvas BG */}
          <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 font-sans">Primary Brand vs Canvas BG</span>
              <span className="font-mono text-slate-500 text-[10px]">{primaryVsBgContrast.toFixed(2)}:1</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getContrastStatus(primaryVsBgContrast).bg}`}>
                {getContrastStatus(primaryVsBgContrast).label}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">{getContrastStatus(primaryVsBgContrast).desc}</span>
            </div>
          </div>

          {/* Button Text vs Button fill */}
          <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 font-sans">White Text on Active Button</span>
              <span className="font-mono text-slate-500 text-[10px]">{btnTextVsBtnColor.toFixed(2)}:1</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getContrastStatus(btnTextVsBtnColor).bg}`}>
                {getContrastStatus(btnTextVsBtnColor).label}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">{getContrastStatus(btnTextVsBtnColor).desc}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
