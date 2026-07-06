import React from 'react';
import { Database, RefreshCw, Info } from 'lucide-react';

interface ThemeDatabaseTabProps {
  supabaseConnected: boolean;
  handleToggleSupabase: () => void;
  supabaseUrl: string;
  setSupabaseUrl: (val: string) => void;
  supabaseKey: string;
  setSupabaseKey: (val: string) => void;
  syncStatus: string;
  handleSaveToSupabase: () => void;
  syncLogs: string[];
  showSqlSchema: boolean;
  setShowSqlSchema: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ThemeDatabaseTab({
  supabaseConnected,
  handleToggleSupabase,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  syncStatus,
  handleSaveToSupabase,
  syncLogs,
  showSqlSchema,
  setShowSqlSchema
}: ThemeDatabaseTabProps) {
  return (
    <div className="space-y-5 animate-fade-in flex flex-col justify-between min-h-[440px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans">Supabase Sync Engine</h3>
            <p className="text-xs text-slate-500 mt-0.5">Maintain real-time durable cloud persistence for brand layout configurations.</p>
          </div>
          
          <button
            type="button"
            onClick={handleToggleSupabase}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border shadow-2xs cursor-pointer transition-all ${
              supabaseConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Database className="h-4 w-4 shrink-0" />
            {supabaseConnected ? 'Sync Enabled' : 'Configure Integration'}
          </button>
        </div>

        {supabaseConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-slide-up">
            
            {/* Connection Settings */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3.5 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Database Credentials</span>
              
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Supabase Endpoint URL</label>
                  <input 
                    type="text" 
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">anon public key / credentials</label>
                  <input 
                    type="password" 
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button 
                  type="button"
                  onClick={handleSaveToSupabase}
                  disabled={syncStatus === 'syncing'}
                  className="px-3.5 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 select-none text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  Push Sync Force
                </button>
              </div>
            </div>

            {/* Sync Logging output console */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block pl-1">Socket connection status stream</span>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[10px] leading-relaxed h-44 overflow-y-auto shadow-inner space-y-1">
                {syncLogs.length > 0 ? (
                  syncLogs.map((logStr, lidx) => (
                    <p key={lidx} className={logStr.includes('✓') ? 'text-emerald-400' : logStr.includes('Executing') ? 'text-blue-300' : 'text-slate-400'}>
                      {`> ${logStr}`}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500 italic">Console idle. Trigger an edit to dispatch queries.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Schema checklist tab */}
        <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-2xl text-xs shadow-2xs shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900 leading-snug font-sans">Verification matrix: Supabase database setup instructions</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Create these database tables in your Supabase SQL editor to achieve cross-session active loading.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setShowSqlSchema(!showSqlSchema)}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer select-none"
            >
              {showSqlSchema ? 'Hide SQL Schema' : 'View SQL Schema'}
            </button>
          </div>

          {showSqlSchema && (
            <div className="mt-3.5 space-y-2 animate-slide-up">
              <pre className="bg-slate-900 text-slate-300 p-3.5 rounded-xl font-mono text-[10px] overflow-x-auto shadow-inner leading-relaxed select-all">
{`-- Supabase SQL Schema for Brand Theme Preferences
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  active_theme_id TEXT NOT NULL,
  theme_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Real-time Row Level Security
ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to own themes"
  ON public.user_theme_preferences
  FOR ALL
  USING (auth.jwt()->>'email' = user_email);`}
              </pre>
              <span className="text-[10px] text-slate-400 font-mono block">Tip: Copy-paste this SQL statement directly into your Supabase Dashboard SQL Editor window.</span>
            </div>
          )}
        </div>

      </div>

      <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed text-center font-medium border shrink-0 font-sans">
        Every user account possesses separate local configurations. Once database syncing keys are supplied, they automatically fetch preferences on login from other machines.
      </div>
    </div>
  );
}
