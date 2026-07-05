import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { CustomTheme } from '../../types';
import { THEME_PRESETS } from './themePresets';

interface ThemePresetsTabProps {
  activeTheme: CustomTheme;
  savedThemes: CustomTheme[];
  handleSelectPreset: (preset: CustomTheme) => void;
  handleDeleteTheme: (id: string) => void;
  setActiveTheme: (theme: CustomTheme) => void;
  onThemeChanged: (themeId: string) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function ThemePresetsTab({
  activeTheme,
  savedThemes,
  handleSelectPreset,
  handleDeleteTheme,
  setActiveTheme,
  onThemeChanged,
  showToast
}: ThemePresetsTabProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Built-In Layout Presets</h3>
        <p className="text-xs text-slate-500 mt-1">Switch to a professionally curated color combination in a single click. Useful for matching classic agency styles.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
        {THEME_PRESETS.map((preset) => {
          const isSelected = activeTheme.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-3.5 border text-left rounded-2xl transition-all hover:scale-[1.02] flex flex-col justify-between h-28 cursor-pointer relative group ${
                isSelected 
                  ? 'border-blue-600 ring-1 ring-blue-500/30 bg-blue-50/10 shadow-sm' 
                  : 'border-slate-200 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs font-sans group-hover:text-blue-600 transition-colors">{preset.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-1 capitalize block">
                  {preset.layout.sidebarStyle} · {preset.typography.fontFamily}
                </span>
              </div>

              {/* Visual color bar dots representing primary, background, card, sidebar */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100/60 w-full">
                <span className="h-4 w-4 rounded-full border border-white shadow-2xs shrink-0" style={{ backgroundColor: preset.colors.primary }} title="Primary Color" />
                <span className="h-4 w-4 rounded-full border border-white shadow-2xs shrink-0" style={{ backgroundColor: preset.colors.background }} title="App Background" />
                <span className="h-4 w-4 rounded-full border border-white shadow-2xs shrink-0" style={{ backgroundColor: preset.colors.cardBackground }} title="Card/Panel Background" />
                <span className="h-4 w-4 rounded-full border border-white shadow-2xs shrink-0" style={{ backgroundColor: preset.colors.sidebarBackground }} title="Sidebar Background" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Saved Themes Section */}
      {savedThemes.length > 0 && (
        <div className="pt-6 border-t border-slate-150 space-y-3">
          <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Your Custom Templates</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedThemes.map((ct) => {
              const isSelected = activeTheme.id === ct.id;
              return (
                <div
                  key={ct.id}
                  className={`p-3 border rounded-2xl flex items-center justify-between transition-all group ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/10' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveTheme({ ...ct });
                      onThemeChanged(ct.id);
                      showToast(`✓ Switched to "${ct.name}" template!`, 'success');
                    }}
                    className="text-left flex-1 min-w-0 pr-2 cursor-pointer"
                  >
                    <p className="font-bold text-slate-800 text-xs truncate font-sans">{ct.name}</p>
                    <span className="text-[9px] text-slate-400 font-mono block uppercase">Custom Template</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteTheme(ct.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
