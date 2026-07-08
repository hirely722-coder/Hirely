import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ArrowLeftRight, 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  Clock, 
  Briefcase, 
  GraduationCap, 
  X, 
  UserCheck, 
  TrendingUp,
  Award
} from 'lucide-react';
import { Candidate, Job, JobCandidate } from '../types';
import { calculateMatchScore } from '../utils/matching';

interface PipelineViewProps {
  candidates: Candidate[];
  jobs: Job[];
  onUpdateCandidateStage: (candidateId: string, newStage: Candidate['status']) => void;
  isLoading?: boolean;
}

const STAGES: Exclude<Candidate['status'], 'Pool'>[] = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Selected', 'Offer Sent', 'Joined'];

const STAGE_THEMES: Record<Exclude<Candidate['status'], 'Pool'>, { border: string; text: string; bg: string; dot: string; hoverBg: string }> = {
  Applied: { 
    border: 'border-t-slate-300', 
    text: 'text-slate-700', 
    bg: 'bg-slate-50', 
    dot: 'bg-slate-400',
    hoverBg: 'hover:bg-slate-100/60'
  },
  Screening: { 
    border: 'border-t-blue-400', 
    text: 'text-blue-700', 
    bg: 'bg-blue-50/30', 
    dot: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-50/60'
  },
  Shortlisted: { 
    border: 'border-t-purple-400', 
    text: 'text-purple-700', 
    bg: 'bg-purple-50/30', 
    dot: 'bg-purple-500',
    hoverBg: 'hover:bg-purple-50/60'
  },
  Interview: { 
    border: 'border-t-amber-400', 
    text: 'text-amber-700', 
    bg: 'bg-amber-50/30', 
    dot: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-50/60'
  },
  Selected: { 
    border: 'border-t-indigo-400', 
    text: 'text-indigo-700', 
    bg: 'bg-indigo-50/30', 
    dot: 'bg-indigo-500',
    hoverBg: 'hover:bg-indigo-50/60'
  },
  'Offer Sent': { 
    border: 'border-t-rose-400', 
    text: 'text-rose-700', 
    bg: 'bg-rose-50/30', 
    dot: 'bg-rose-500',
    hoverBg: 'hover:bg-rose-50/60'
  },
  Joined: { 
    border: 'border-t-emerald-400', 
    text: 'text-emerald-700', 
    bg: 'bg-emerald-50/30', 
    dot: 'bg-emerald-500',
    hoverBg: 'hover:bg-emerald-50/60'
  }
};

// Deterministic modern avatar color generator
const getAvatarTheme = (name: string) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const themes = [
    { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100/80', dot: 'bg-indigo-500' },
    { bg: 'bg-rose-50 text-rose-700 border-rose-100/80', dot: 'bg-rose-500' },
    { bg: 'bg-amber-50 text-amber-700 border-amber-100/80', dot: 'bg-amber-500' },
    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100/80', dot: 'bg-emerald-500' },
    { bg: 'bg-sky-50 text-sky-700 border-sky-100/80', dot: 'bg-sky-500' },
    { bg: 'bg-violet-50 text-violet-700 border-violet-100/80', dot: 'bg-violet-500' },
    { bg: 'bg-teal-50 text-teal-700 border-teal-100/80', dot: 'bg-teal-500' },
  ];
  return themes[hash % themes.length];
};

// Dynamic search helper that checks name, company, and skills
const candidateMatchesSearch = (candidate: Candidate, searchLower: string) => {
  if (!searchLower) return true;
  if (!candidate) return false;
  return (
    (candidate.name || '').toLowerCase().includes(searchLower) ||
    (candidate.currentCompany || '').toLowerCase().includes(searchLower) ||
    (candidate.skills || []).some(skill => (skill || '').toLowerCase().includes(searchLower)) ||
    (candidate.education || '').toLowerCase().includes(searchLower)
  );
};

export default function PipelineView({
  candidates,
  jobs,
  onUpdateCandidateStage,
  isLoading = false
}: PipelineViewProps) {
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);
  const [activeDropStage, setActiveDropStage] = useState<Exclude<Candidate['status'], 'Pool'> | null>(null);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [minExperience, setMinExperience] = useState<string>('all');

  const [jobCandidates, setJobCandidates] = useState<JobCandidate[]>([]);
  const [jobCandidatesLoading, setJobCandidatesLoading] = useState(false);

  useEffect(() => {
    const fetchJobCandidates = async () => {
      setJobCandidatesLoading(true);
      try {
        const { supabase } = await import('../utils/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const url = selectedJobId === 'all' ? '/api/job-candidates' : `/api/job-candidates/${selectedJobId}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setJobCandidates(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch job candidates:', err);
      } finally {
        setJobCandidatesLoading(false);
      }
    };
    fetchJobCandidates();
  }, [selectedJobId]);

  // Find selected job for dynamic skill match score overlay
  const selectedJob = useMemo(() => {
    return jobs.find(j => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  // Map candidates based on whether we are looking at all candidates or a specific job
  const activeCandidates = useMemo(() => {
    return jobCandidates.map(jc => {
      if (!jc.candidate) return null;
      return {
        ...jc.candidate,
        status: jc.stage, // override status with per-job stage
        jobCandidateId: jc.id // attach junction id
      };
    }).filter(Boolean) as (Candidate & { jobCandidateId?: string })[];
  }, [jobCandidates]);

  // Calculate customized match score for candidate against the currently filtered job
  const getDynamicMatchScore = (candidate: Candidate) => {
    if (!selectedJob) return candidate.aiMatchScore || 85;
    return calculateMatchScore(candidate, selectedJob);
  };

  // Filter candidates list based on active filters
  const filteredCandidates = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    
    return activeCandidates.filter(candidate => {
      // 1. Search Query Filter
      if (!candidateMatchesSearch(candidate, searchLower)) return false;
      
      // 2. Min Experience Filter
      if (minExperience !== 'all') {
        const candidateExp = parseInt(candidate.experience) || 0;
        const requiredExp = parseInt(minExperience) || 0;
        if (candidateExp < requiredExp) return false;
      }
      
      // 3. Selected Job Skill Association Filter
      if (selectedJobId !== 'all' && selectedJob) {
        // Show candidates with at least some overlap, or whose profile correlates
        const score = getDynamicMatchScore(candidate);
        if (score < 20) return false; // Filter out completely unmatched profiles
      }
      
      return true;
    });
  }, [activeCandidates, searchQuery, selectedJobId, selectedJob, minExperience]);

  // Group filtered candidates by stage
  const groupedCandidates = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage] = filteredCandidates.filter(c => c.status === stage);
      return acc;
    }, {} as Record<Exclude<Candidate['status'], 'Pool'>, Candidate[]>);
  }, [filteredCandidates]);

  // Pipeline metrics calculation
  const metrics = useMemo(() => {
    const total = filteredCandidates.length;
    const active = filteredCandidates.filter(c => ['Screening', 'Shortlisted', 'Interview'].includes(c.status)).length;
    const inInterview = filteredCandidates.filter(c => c.status === 'Interview').length;
    const hired = filteredCandidates.filter(c => c.status === 'Joined' || c.status === 'Selected').length;
    
    return { total, active, inInterview, hired };
  }, [filteredCandidates]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCandidateId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: Exclude<Candidate['status'], 'Pool'>) => {
    e.preventDefault();
    if (activeDropStage !== stage) {
      setActiveDropStage(stage);
    }
  };

  const handleDragLeave = () => {
    setActiveDropStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: Exclude<Candidate['status'], 'Pool'>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedCandidateId;
    if (id) {
      const cand = activeCandidates.find(c => c.id === id);
      if (cand && (cand as any).jobCandidateId) {
        const jcId = (cand as any).jobCandidateId;
        const originalStage = cand.status as Exclude<Candidate['status'], 'Pool'>;

        // 1. Optimistic Update (instant UI response)
        setJobCandidates(prev => prev.map(jc => jc.id === jcId ? { ...jc, stage: targetStage } : jc));

        // 2. Network Request in background
        (async () => {
          try {
            const { supabase } = await import('../utils/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch(`/api/job-candidates/${jcId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ stage: targetStage }),
            });
            if (!res.ok) throw new Error('Failed to update job candidate stage on server');
          } catch (err) {
            console.error('Failed to update stage on drop, reverting:', err);
            // Revert state if failed
            setJobCandidates(prev => prev.map(jc => jc.id === jcId ? { ...jc, stage: originalStage } : jc));
          }
        })();
      } else {
        onUpdateCandidateStage(id, targetStage);
      }
    }
    setDraggedCandidateId(null);
    setActiveDropStage(null);
  };

  const handleMoveCandidate = async (id: string, currentStage: Exclude<Candidate['status'], 'Pool'>, direction: 'prev' | 'next') => {
    const currentIndex = STAGES.indexOf(currentStage);
    const targetIndex = currentIndex + (direction === 'next' ? 1 : -1);
    if (targetIndex >= 0 && targetIndex < STAGES.length) {
      const targetStage = STAGES[targetIndex];
      const cand = activeCandidates.find(c => c.id === id);
      if (cand && (cand as any).jobCandidateId) {
        const jcId = (cand as any).jobCandidateId;
        const originalStage = cand.status as Exclude<Candidate['status'], 'Pool'>;

        // 1. Optimistic Update (instant UI response)
        setJobCandidates(prev => prev.map(jc => jc.id === jcId ? { ...jc, stage: targetStage } : jc));

        // 2. Network Request in background
        (async () => {
          try {
            const { supabase } = await import('../utils/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch(`/api/job-candidates/${jcId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ stage: targetStage }),
            });
            if (!res.ok) throw new Error('Failed to update job candidate stage on server');
          } catch (err) {
            console.error('Failed to update stage via click, reverting:', err);
            // Revert state if failed
            setJobCandidates(prev => prev.map(jc => jc.id === jcId ? { ...jc, stage: originalStage } : jc));
          }
        })();
      } else {
        onUpdateCandidateStage(id, targetStage);
      }
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedJobId('all');
    setMinExperience('all');
  };

  return (
    <div className="space-y-6 animate-fade-in" id="pipeline-view">
      
      {/* 1. Header with metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            Hiring Pipeline
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
              Kaban View
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Seamlessly track progress. Drag and drop cards to transition candidates, or use the interactive stage triggers.
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 flex items-center gap-1.5 font-medium">
            <ArrowLeftRight className="h-3 w-3 text-slate-400 animate-pulse" />
            Drag & Drop enabled
          </span>
        </div>
      </div>

      {/* 2. Mini KPI Stats Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100/80">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Under Evaluation</p>
            <p className="text-base font-bold text-slate-800 font-sans">{metrics.total} Candidates</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100/80">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Active Review</p>
            <p className="text-base font-bold text-slate-800 font-sans">{metrics.active} Profiles</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100/80">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="h-4 w-4 animate-spin-slow" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">In Interview</p>
            <p className="text-base font-bold text-slate-800 font-sans">{metrics.inInterview} Live Scheduled</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100/80">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Offers/Hired</p>
            <p className="text-base font-bold text-slate-800 font-sans">{metrics.hired} Confirmed</p>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Row */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Filter by name, previous company, skills or education..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium font-sans">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span>Filters:</span>
            </div>

            {/* Job Association Selector */}
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition-all cursor-pointer font-sans"
            >
              <option value="all">All Job Matches</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title} ({job.companyName})</option>
              ))}
            </select>

            {/* Minimum Experience Filter */}
            <select
              value={minExperience}
              onChange={(e) => setMinExperience(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition-all cursor-pointer font-sans"
            >
              <option value="all">Any Experience</option>
              <option value="1">1+ Years Exp</option>
              <option value="3">3+ Years Exp</option>
              <option value="5">5+ Years Exp</option>
              <option value="8">8+ Years Exp</option>
            </select>

            {/* Clear filters if active */}
            {(searchQuery || selectedJobId !== 'all' || minExperience !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-100 transition-all cursor-pointer font-sans"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>

        </div>

        {/* Filters Active indicator */}
        {selectedJob && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 flex items-center justify-between text-[11px] text-emerald-800 animate-fade-in font-sans">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span>
                Matching candidates with <strong>{selectedJob.title}</strong> required skills: <strong>{selectedJob.requiredSkills.join(', ')}</strong>.
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold bg-white/80 border border-emerald-200 text-emerald-700 px-1.5 py-0.25 rounded">
              Overlay Match Scores Active
            </span>
          </div>
        )}
      </div>

      {/* 4. Kanban Horizontal Board */}
      <div className="flex gap-4 items-start overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {STAGES.map((stage) => {
          const stageList = groupedCandidates[stage] || [];
          const theme = STAGE_THEMES[stage];
          const isOverThisStage = activeDropStage === stage;

          return (
            <div 
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
              className={`flex-shrink-0 w-80 bg-slate-50/60 border border-slate-200/60 rounded-2xl p-3 min-h-[550px] flex flex-col space-y-3 transition-all duration-200 ${
                isOverThisStage ? 'bg-blue-50/50 border-blue-300 border-dashed ring-2 ring-blue-100 scale-[1.01]' : ''
              }`}
            >
              
              {/* Stage Header Block */}
              <div className={`p-2.5 border-t-2 ${theme.border} ${theme.bg} rounded-xl flex items-center justify-between border border-slate-200/30 shadow-xs`}>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                  <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">{stage}</span>
                </div>
                {isLoading || jobCandidatesLoading ? (
                  <span className="h-4 w-6 bg-slate-100 animate-pulse rounded-full" />
                ) : (
                  <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 bg-white text-slate-700 rounded-full border border-slate-200/50 shadow-2xs">
                    {stageList.length}
                  </span>
                )}
              </div>

              {/* Scrollable Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[500px] pr-1.5 scrollbar-thin">
                {isLoading || jobCandidatesLoading ? (
                  [...Array(2)].map((_, i) => (
                    <div key={i} className="p-3 bg-white border border-slate-200/80 rounded-lg shadow-2xs animate-pulse space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-6 rounded-full bg-slate-100" />
                        <div className="h-4 w-12 bg-slate-100 rounded" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 bg-slate-200 rounded" />
                        <div className="h-2.5 w-24 bg-slate-100 rounded" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-4 w-12 bg-slate-100 rounded" />
                        <div className="h-4 w-16 bg-slate-100 rounded" />
                      </div>
                    </div>
                  ))
                ) : stageList.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-xl bg-white/40 font-sans">
                    <p className="font-semibold">No candidates</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Drop candidate card here</p>
                  </div>
                ) : (
                  stageList.map((candidate) => {
                    const avatarColor = getAvatarTheme(candidate.name);
                    const initials = candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    
                    // Dynamic math calculation
                    const matchScore = getDynamicMatchScore(candidate);
                    const isHighMatch = matchScore >= 80;

                    return (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, candidate.id)}
                        className={`p-3 bg-white border-2 border-slate-300/95 rounded-lg shadow-2xs hover:shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-400 transition-all duration-200 group relative flex flex-col justify-between ${
                          draggedCandidateId === candidate.id ? 'opacity-35 border-dashed border-blue-400 bg-slate-50' : ''
                        }`}
                      >
                        <div>
                          
                          {/* Card Header: Avatar & Score */}
                          <div className="flex items-center justify-between gap-1.5 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {/* Circle Initials Avatar */}
                              <div className={`h-6 w-6 rounded border flex items-center justify-center font-mono text-[9px] font-bold shrink-0 shadow-3xs ${avatarColor.bg}`}>
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate font-sans leading-none">
                                  {candidate.name}
                                </h3>
                                <p className="text-[9px] text-slate-400 truncate font-sans mt-0.5 leading-none">
                                  {candidate.currentCompany || 'Freelancer'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Score badge with custom tooltips or sparkles */}
                            <span className={`px-1.5 py-0.25 rounded text-[9px] font-mono font-bold shrink-0 border flex items-center gap-0.5 ${
                              isHighMatch 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : matchScore >= 50
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {isHighMatch && <Sparkles className="h-2 w-2 text-emerald-500 animate-pulse" />}
                              {matchScore}%
                            </span>
                          </div>

                          {/* Candidate metadata details */}
                          <div className="space-y-1 text-[9.5px] text-slate-500 font-sans border-t border-slate-100 pt-2">
                            {/* Experience */}
                            <div className="flex items-center gap-1">
                              <Award className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700">{candidate.experience} Experience</span>
                            </div>

                            {/* Education / University */}
                            <div className="flex items-center gap-1 min-w-0">
                              <GraduationCap className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate font-medium text-slate-600">{candidate.education}</span>
                            </div>

                            {/* Skills Tag list */}
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {(candidate.skills || []).slice(0, 3).map((skill, sIdx) => (
                                <span 
                                  key={sIdx} 
                                  className="px-1 py-0.25 bg-slate-100/80 text-slate-600 rounded text-[8.5px] font-medium border border-slate-200"
                                >
                                  {skill}
                                </span>
                              ))}
                              {(candidate.skills || []).length > 3 && (
                                <span className="text-[8px] font-mono text-slate-400 font-semibold pl-0.5">
                                  +{(candidate.skills || []).length - 3}
                                </span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Staged Quick Move triggers (accessibility, tablets, & mobile) */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            disabled={stage === 'Applied'}
                            onClick={() => handleMoveCandidate(candidate.id, stage, 'prev')}
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-800 disabled:opacity-20 py-0.5 px-1 font-sans flex items-center gap-0.5 hover:bg-slate-50 rounded transition-all cursor-pointer"
                          >
                            <ChevronLeft className="h-2.5 w-2.5" />
                            Back
                          </button>
                          
                          {/* Small date label */}
                          <div className="flex items-center gap-0.5 text-[8.5px] text-slate-400 font-mono">
                            <Calendar className="h-2.5 w-2.5 text-slate-300" />
                            <span>{candidate.appliedDate || 'Recent'}</span>
                          </div>

                          <button
                            disabled={stage === 'Joined'}
                            onClick={() => handleMoveCandidate(candidate.id, stage, 'next')}
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-800 disabled:opacity-20 py-0.5 px-1 font-sans flex items-center gap-0.5 hover:bg-slate-50 rounded transition-all cursor-pointer"
                          >
                            Next
                            <ChevronRight className="h-2.5 w-2.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
