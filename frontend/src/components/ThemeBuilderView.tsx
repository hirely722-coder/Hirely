import React from 'react';
import { 
  Paintbrush, Sliders, Type, Layout, Palette, Sparkles, Check, AlertTriangle, 
  Info, RefreshCw, Download, Upload, Trash2, Copy, Play, CheckCircle2, 
  Database, ShieldAlert, Plus, HelpCircle, Eye, Moon, Sun, Monitor, Save, Flame, CheckCircle, ChevronDown, RefreshCcw
} from 'lucide-react';
import { useThemeBuilderState } from './theme/useThemeBuilderState';
import { calculateContrast, getContrastStatus } from './theme/themeHelpers';

import { ThemePresetsTab } from './theme/ThemePresetsTab';
import { ThemeColorsTab } from './theme/ThemeColorsTab';
import { ThemeTypographyTab } from './theme/ThemeTypographyTab';
import { ThemeLayoutTab } from './theme/ThemeLayoutTab';
import { ThemeBrandingTab } from './theme/ThemeBrandingTab';
import { ThemeDatabaseTab } from './theme/ThemeDatabaseTab';
import { ThemeImportModal } from './theme/ThemeImportModal';

interface ThemeBuilderViewProps {
  currentThemeId: string;
  onThemeChanged: (themeId: string) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export default function ThemeBuilderView(props: ThemeBuilderViewProps) {
  const state = useThemeBuilderState(props);

  return (
    <div className="space-y-6 animate-fade-in" id="theme-builder-panel">
      
      {/* Banner / Current Theme status display */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-extrabold text-slate-900 font-sans">Active Brand Layout</h2>
          </div>
          <div className="flex items-center gap-2.5">
            {state.isEditingName ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input 
                  type="text"
                  value={state.renameValue}
                  onChange={(e) => state.setRenameValue(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-800 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && state.handleRenameTheme()}
                />
                <button onClick={state.handleRenameTheme} className="p-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 font-bold hover:bg-emerald-100 cursor-pointer">
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-md font-black text-slate-850 font-sans">{state.activeTheme.name}</span>
                {!state.activeTheme.isPreset && (
                  <button onClick={() => { state.setRenameValue(state.activeTheme.name); state.setIsEditingName(true); }} className="text-[10px] text-blue-600 hover:underline cursor-pointer bg-transparent border-none">Rename</button>
                )}
              </div>
            )}
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono ${state.activeTheme.isPreset ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
              {state.activeTheme.isPreset ? 'preset' : 'custom agency template'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans">Live previewing dynamic properties across variables. Every color picker adjustment propagates instantly.</p>
        </div>

        {/* Sync Indicator and general actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {state.supabaseConnected ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2 rounded-xl text-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    state.syncStatus === 'synced' ? 'bg-emerald-500' :
                    state.syncStatus === 'syncing' ? 'bg-indigo-500 animate-spin' :
                    state.syncStatus === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span className="font-bold text-slate-800 font-mono capitalize text-[10px]">{state.syncStatus}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">Supabase Server Sync</span>
              </div>
              
              {state.syncStatus === 'pending' && (
                <button 
                  onClick={state.handleSaveToSupabase}
                  className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer select-none"
                >
                  <Save className="h-3 w-3" /> Sync Now
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 text-slate-400 border border-slate-200/60 rounded-xl p-2 text-center text-[9px] font-bold font-mono">
              LOCAL SANDBOX ACTIVE
            </div>
          )}

          <button 
            onClick={state.handleCreateTheme}
            className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer select-none"
            title="Saves configuration as a new duplicate layout"
          >
            <Plus className="h-3.5 w-3.5" /> Save New Theme
          </button>

          <button 
            onClick={state.handleExportTheme}
            className="px-3 py-2 text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none"
            title="Download .json layout"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" /> Export
          </button>

          <button 
            onClick={() => state.setShowImportDialog(true)}
            className="px-3 py-2 text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none"
            title="Import exported JSON layout"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" /> Import
          </button>
        </div>
      </div>

      {/* Grid Layout of controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Bento: Control Category Side Menu */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block px-3 mb-2">Configure Settings</span>
            
            {[
              { id: 'presets', label: 'Ready-Made Presets', icon: Palette, badge: 8 },
              { id: 'colors', label: 'Color Customization', icon: Paintbrush },
              { id: 'typography', label: 'Typography / Fonts', icon: Type },
              { id: 'layout', label: 'Paddings & Spacing', icon: Layout },
              { id: 'branding', label: 'Agency Branding', icon: Sparkles },
              { id: 'database', label: 'Supabase Sync Engine', icon: Database, badge: state.supabaseConnected ? 'On' : 'Off' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => state.setActiveSection(cat.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all cursor-pointer ${
                  state.activeSection === cat.id 
                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <cat.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{cat.label}</span>
                {cat.badge !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-extrabold ${
                    state.activeSection === cat.id ? 'bg-blue-700 text-white' : 'bg-slate-150 text-slate-600'
                  }`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Resets block */}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-4 space-y-3 shadow-sm border border-slate-800">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Layout Resets</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold font-sans">
              <button 
                onClick={() => state.handleReset('colors')}
                className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset Colors
              </button>
              <button 
                onClick={() => state.handleReset('typography')}
                className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset Font
              </button>
              <button 
                onClick={() => state.handleReset('layout')}
                className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset Spacing
              </button>
              <button 
                onClick={() => state.handleReset('all')}
                className="p-2 bg-rose-900/45 hover:bg-rose-900 border border-rose-800/60 text-rose-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Center/Right Bento: Active config controls pane */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs min-h-[460px]">
            
            {state.activeSection === 'presets' && (
              <ThemePresetsTab
                activeTheme={state.activeTheme}
                savedThemes={state.savedThemes}
                handleSelectPreset={state.handleSelectPreset}
                handleDeleteTheme={state.handleDeleteTheme}
                setActiveTheme={state.setActiveTheme}
                onThemeChanged={props.onThemeChanged}
                showToast={props.showToast}
              />
            )}

            {state.activeSection === 'colors' && (
              <ThemeColorsTab
                activeTheme={state.activeTheme}
                handleColorChange={state.handleColorChange}
                calculateContrast={calculateContrast}
                getContrastStatus={getContrastStatus}
              />
            )}

            {state.activeSection === 'typography' && (
              <ThemeTypographyTab
                activeTheme={state.activeTheme}
                handleTypographyChange={state.handleTypographyChange}
              />
            )}

            {state.activeSection === 'layout' && (
              <ThemeLayoutTab
                activeTheme={state.activeTheme}
                handleLayoutChange={state.handleLayoutChange}
              />
            )}

            {state.activeSection === 'branding' && (
              <ThemeBrandingTab
                activeTheme={state.activeTheme}
                setActiveTheme={state.setActiveTheme}
                showToast={props.showToast}
              />
            )}

            {state.activeSection === 'database' && (
              <ThemeDatabaseTab
                supabaseConnected={state.supabaseConnected}
                handleToggleSupabase={state.handleToggleSupabase}
                supabaseUrl={state.supabaseUrl}
                setSupabaseUrl={state.setSupabaseUrl}
                supabaseKey={state.supabaseKey}
                setSupabaseKey={state.setSupabaseKey}
                syncStatus={state.syncStatus}
                handleSaveToSupabase={state.handleSaveToSupabase}
                syncLogs={state.syncLogs}
                showSqlSchema={state.showSqlSchema}
                setShowSqlSchema={state.setShowSqlSchema}
              />
            )}

          </div>
        </div>

      </div>

      <ThemeImportModal
        isOpen={state.showImportDialog}
        onClose={() => state.setShowImportDialog(false)}
        importText={state.importText}
        setImportText={state.setImportText}
        handleImportJson={state.handleImportJson}
        handleImportFile={state.handleImportFile}
      />

    </div>
  );
}
