import React from 'react';
import { Candidate, JobCandidate } from '../../types';

interface JobPipelineTabProps {
  jobCandidates: JobCandidate[];
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetStage: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
}

export function JobPipelineTab({
  jobCandidates,
  handleDragOver,
  handleDrop,
  handleDragStart
}: JobPipelineTabProps) {
  const stages: JobCandidate['stage'][] = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Selected', 'Offer Sent', 'Joined'];
  
  const stageColors: Record<JobCandidate['stage'], { bg: string; text: string; dot: string; border: string }> = {
    'Applied': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' },
    'Screening': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-100' },
    'Shortlisted': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-100' },
    'Interview': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-100' },
    'Selected': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' },
    'Offer Sent': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-100' },
    'Joined': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', border: 'border-teal-100' }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Hiring Pipeline Status Board</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Drag card elements between stages to shift hiring states in database.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold">
          <span>Pipeline size: {jobCandidates.length}</span>
        </div>
      </div>

      {/* Horizontal scroll flex container for the Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin select-none min-h-[500px]">
        {stages.map((stage) => {
          const stageCandidates = jobCandidates.filter(jc => jc.stage === stage);
          const colors = stageColors[stage] || { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' };

          return (
            <div 
              key={stage}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
              className="bg-slate-50/70 rounded-xl p-3 w-72 shrink-0 border border-slate-200/60 flex flex-col space-y-3 min-h-[420px] transition-all hover:bg-slate-100/50"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className="text-xs font-bold text-slate-800 font-sans">{stage}</span>
                </div>
                <span className={`${colors.bg} ${colors.text} font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border ${colors.border}`}>
                  {stageCandidates.length}
                </span>
              </div>

              <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto max-h-[400px] pr-1 scrollbar-none">
                {stageCandidates.map(jc => {
                  const cand = jc.candidate;
                  if (!cand) return null;
                  return (
                    <div
                      key={jc.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cand.id)}
                      className="bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all space-y-2 select-none group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-slate-900 text-white font-mono flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                          {cand.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="truncate flex-1">
                          <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate leading-tight">{cand.name}</h4>
                          <p className="text-[9px] text-slate-500 mt-0.5 truncate leading-tight">{cand.experience}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {cand.skills && cand.skills.slice(0, 2).map((skill, sIdx) => (
                          <span key={sIdx} className="text-[8px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">
                            {skill}
                          </span>
                        ))}
                        {cand.skills && cand.skills.length > 2 && (
                          <span className="text-[8px] text-slate-400 font-medium px-1 self-center">
                            +{cand.skills.length - 2}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[9px]">
                        <span className="text-slate-400 truncate max-w-[110px]" title={cand.currentCompany}>
                          {cand.currentCompany || 'Freelance'}
                        </span>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded">
                          AI: {cand.aiMatchScore || 85}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {stageCandidates.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 text-[10px] border-2 border-dashed rounded-xl border-slate-200/60 bg-slate-50/30">
                    <span className="font-medium text-slate-400">No candidates here</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Drag profile card to this stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
