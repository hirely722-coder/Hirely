import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Company } from '../../types';
import { Note } from '../../types';

interface CompanyAiInsightsTabProps {
  company: Company;
  setShowSubmitModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  showLocalToast: (text: string, type: 'success' | 'error') => void;
}

export function CompanyAiInsightsTab({
  company,
  setShowSubmitModal,
  setNotes,
  showLocalToast
}: CompanyAiInsightsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-4 bg-blue-50 border border-blue-100 text-blue-900 rounded-2xl flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <p className="font-bold text-sm font-sans">AI Recruitment Sourcing Insights</p>
          <p className="text-xs text-blue-700 mt-0.5 font-sans">Real-time stats tracking candidates throughput and client response metrics for {company.name}.</p>
        </div>
      </div>

      {/* Smart KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Average Hiring Time</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">18 Days</span>
          <span className="text-[10px] text-emerald-600 font-bold font-mono mt-1 block">↓ 4 Days from Avg</span>
        </div>
        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Client Response Rate</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">92%</span>
          <span className="text-[10px] text-emerald-600 font-bold font-mono mt-1 block">Excellent Response</span>
        </div>
        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Candidate Accept Rate</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">85%</span>
          <span className="text-[10px] text-blue-600 font-bold font-mono mt-1 block">Consistent Pipeline</span>
        </div>
        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Average Match Score</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">84%</span>
          <span className="text-[10px] text-indigo-600 font-bold font-mono mt-1 block">High Quality Matches</span>
        </div>
      </div>

      {/* AI Smart Suggestions */}
      <div className="space-y-3">
        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">SMART SUGGESTIONS FOR SARAH</p>
        
        <div className="space-y-2 text-xs">
          <div className="p-3.5 bg-amber-50/30 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold font-sans">High experience constraint detected</p>
              <p className="text-[11px] text-amber-850 mt-0.5 font-sans">"Your active vacancy for React Developer requires '7+ Years' experience, yielding very few high matching candidates. Consider lowering this threshold to 4+ Years."</p>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/30 border border-blue-100 text-blue-900 rounded-xl flex items-start gap-2.5 shadow-2xs">
            <Sparkles className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold font-sans">Excellent match candidate pool available</p>
              <p className="text-[11px] text-blue-850 mt-0.5 font-sans">"We analyzed your local talent database. 15 newly uploaded candidates match the requirements of open roles at {company.name} perfectly."</p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Dispatch Triggers */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2.5">
        <button 
          onClick={() => {
            setShowSubmitModal(true);
            showLocalToast('AI sourcing agent booted. Select a vacancy to search candidates.', 'success');
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Find Best Candidates
        </button>
        <button 
          onClick={() => {
            showLocalToast('✓ Candidate shortlist generated and copied to note timeline!', 'success');
            const newN: Note = {
              id: `shortlist_${Date.now()}`,
              content: '🤖 [AI Generated Shortlist]\nRecommended Candidate Profiles for evaluation:\n- Emily Watson (95% Match) - Expert UI Engineer\n- Sarah Connor (88% Match) - Senior React Developer',
              author: 'AI Recruiter',
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
            };
            setNotes(prev => [newN, ...prev]);
          }}
          className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer transition-colors"
        >
          Generate Candidate Shortlist
        </button>
        <button 
          onClick={() => showLocalToast('✓ Hiring Report PDF generated successfully!', 'success')}
          className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer transition-colors"
        >
          Generate Hiring Report
        </button>
      </div>
    </div>
  );
}
