import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar } from 'lucide-react';
import { Candidate } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface JobInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  interviewCandidate: Candidate | null;
  setInterviewCandidate: (cand: Candidate | null) => void;
  interviewDate: string;
  setInterviewDate: (date: string) => void;
  interviewTime: string;
  setInterviewTime: (time: string) => void;
  interviewerName: string;
  setInterviewerName: (name: string) => void;
  interviewRound: string;
  setInterviewRound: (round: string) => void;
  handleScheduleSubmit: (e: React.FormEvent) => void;
}

export function JobInterviewModal({
  isOpen,
  onClose,
  candidates,
  interviewCandidate,
  setInterviewCandidate,
  interviewDate,
  setInterviewDate,
  interviewTime,
  setInterviewTime,
  interviewerName,
  setInterviewerName,
  interviewRound,
  setInterviewRound,
  handleScheduleSubmit
}: JobInterviewModalProps) {
  const [isOpenLocal, setIsOpenLocal] = useState(isOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOpenLocal(isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setIsOpenDropdown(false);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setIsOpenLocal(false);
    setTimeout(onClose, 200);
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.currentCompany || 'Freelancer').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatedModal isOpen={isOpenLocal} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-slate-500" />
              Schedule Interview Round
            </h3>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleScheduleSubmit} className="p-4 space-y-4">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Target Candidate</label>
              <button
                type="button"
                onClick={() => setIsOpenDropdown(!isOpenDropdown)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-white text-left flex items-center justify-between shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
              >
                <span className="truncate">
                  {interviewCandidate 
                    ? `${interviewCandidate.name} (${interviewCandidate.currentCompany || 'Freelancer'})`
                    : 'Select a candidate...'}
                </span>
                <span className="text-[10px] text-slate-400 ml-2">▼</span>
              </button>

              {isOpenDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <input
                      type="text"
                      placeholder="Search candidate name or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
                    {filteredCandidates.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No candidates found
                      </div>
                    ) : (
                      filteredCandidates.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setInterviewCandidate(c);
                            setIsOpenDropdown(false);
                            setSearchTerm('');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col ${
                            interviewCandidate?.id === c.id ? 'bg-indigo-50/50 font-semibold text-indigo-600' : 'text-slate-700'
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{c.currentCompany || 'Freelancer'}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Time</label>
                <input 
                  type="text"
                  required
                  placeholder="E.g., 11:00 AM"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Primary Interviewer</label>
              <input 
                type="text"
                required
                placeholder="E.g., Marc Lou (Frontend Architect)"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Round / Stage Category</label>
              <input 
                type="text"
                required
                placeholder="E.g., Technical Coding Challenge"
                value={interviewRound}
                onChange={(e) => setInterviewRound(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button 
                type="button" 
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded shadow-xs cursor-pointer"
              >
                Schedule & Dispatched Email
              </button>
            </div>
          </form>
        </div>
      )}
    </AnimatedModal>
  );
}
