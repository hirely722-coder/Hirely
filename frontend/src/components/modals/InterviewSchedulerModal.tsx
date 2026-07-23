import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Candidate, Job, CommunicationLog } from '../../types';
import AnimatedModal from '../AnimatedModal';
import { useApp } from '../../context/AppContext';

interface InterviewSchedulerModalProps {
  candidate: Candidate;
  jobs: Job[];
  onClose: () => void;
  onSchedule: (title: string, date: string, log: CommunicationLog, autoCreateTask: boolean) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function InterviewSchedulerModal({
  candidate,
  jobs,
  onClose,
  onSchedule,
  showToast
}: InterviewSchedulerModalProps) {
  const { user } = useApp();
  const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Your Recruiter';
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200);
  };

  const [selectedJobId, setSelectedJobId] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setInterviewDate(tomorrow.toISOString().split('T')[0]);
  }, [jobs]);

  const handleSchedule = () => {
    if (!interviewDate) {
      showToast('❌ Please select a valid date.', 'error');
      return;
    }

    setIsScheduling(true);
    setTimeout(() => {
      setIsScheduling(false);

      const job = jobs.find(j => j.id === selectedJobId) || jobs[0];
      const sessionTitle = `Interview for ${job.title} at ${job.companyName}`;

      const log: CommunicationLog = {
        id: 'cl_' + Date.now(),
        candidateId: candidate.id,
        type: 'Interview',
        date: `${interviewDate} ${interviewTime}`,
        status: 'Sent',
        sentBy: currentUserName,
        subject: `Interview Invitation: ${sessionTitle}`,
        message: `Scheduled standard recruitment assessment. Notes: ${notes || 'None'}`
      };

      onSchedule(sessionTitle, `${interviewDate} ${interviewTime}`, log, true);
      showToast('✓ Interview Scheduled & Calendar Event Dispatched!', 'success');
      handleClose();
    }, 1000);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Schedule Interview</h3>
                <p className="text-[10px] text-slate-404 font-mono">Assigned Recruiter: {currentUserName}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-605 rounded cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5 text-xs font-sans">
            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Candidate</label>
              <input 
                type="text" 
                readOnly 
                value={candidate.name}
                className="w-full px-3 py-1.5 text-xs border border-slate-150 bg-slate-50 text-slate-505 rounded-lg cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Target Job Position</label>
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title} ({j.companyName})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Session Date</label>
                <input 
                  type="date" 
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Session Time</label>
                <input 
                  type="time" 
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Brief Agenda / Notes</label>
              <textarea 
                rows={3}
                placeholder="e.g. Design portfolio walkthrough, API deep-dive..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 resize-none focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
            <button 
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-655 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSchedule}
              disabled={isScheduling}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer select-none font-sans"
            >
              {isScheduling ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  Confirm Assessment
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
