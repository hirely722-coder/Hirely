import React from 'react';
import { Calendar, Clock, X, Plus } from 'lucide-react';
import { Candidate } from '../../types';
import { JobInterview } from '../../utils/jobMockData';

interface JobInterviewsTabProps {
  candidates: Candidate[];
  filteredInterviews: JobInterview[];
  setInterviewCandidate: (cand: Candidate | null) => void;
  setInterviewDate: (date: string) => void;
  setInterviewTime: (time: string) => void;
  setShowInterviewModal: (show: boolean) => void;
  handleUpdateInterviewStatus: (id: string, status: JobInterview['status'], feedback?: string) => void;
  generateMeetingLink: (id: string) => void;
}

export function JobInterviewsTab({
  candidates,
  filteredInterviews,
  setInterviewCandidate,
  setInterviewDate,
  setInterviewTime,
  setShowInterviewModal,
  handleUpdateInterviewStatus,
  generateMeetingLink
}: JobInterviewsTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-xs font-bold text-slate-900">Scheduled Interviews & Assessments</h3>
        <button 
          onClick={() => {
            setInterviewCandidate(candidates[0] || null);
            setInterviewDate(new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]);
            setInterviewTime('11:00 AM');
            setShowInterviewModal(true);
          }}
          className="px-2.5 py-1 text-[10px] font-semibold bg-slate-950 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          New Assessment Row
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-mono uppercase text-slate-400 border-b">
              <th className="p-3">Candidate</th>
              <th className="p-3">Interview Date / Time</th>
              <th className="p-3">Primary Interviewer</th>
              <th className="p-3">Round</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredInterviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  No assessments matching search parameters.
                </td>
              </tr>
            ) : (
              filteredInterviews.map((int) => (
                <tr key={int.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900">{int.candidateName}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono">{int.date}</span>
                      <span className="font-mono text-slate-400">@</span>
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono">{int.time}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{int.interviewer}</td>
                  <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">{int.round}</span></td>
                  <td className="p-3 text-center">
                    <select 
                      value={int.status}
                      onChange={(e) => handleUpdateInterviewStatus(int.id, e.target.value as any)}
                      className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${
                        int.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        int.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Feedback Pending">Feedback Pending</option>
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => generateMeetingLink(int.id)}
                        className="px-2 py-0.5 text-[9px] border border-indigo-200 text-indigo-700 hover:bg-indigo-50/30 rounded"
                        title="Spawn virtual bridge link"
                      >
                        Spawn Link
                      </button>
                      <button 
                        onClick={() => {
                          const fb = prompt(`Write feedback for ${int.candidateName}:`, int.feedback || '');
                          if (fb !== null) {
                            handleUpdateInterviewStatus(int.id, 'Completed', fb);
                          }
                        }}
                        className="px-2 py-0.5 text-[9px] border border-slate-200 hover:bg-slate-100 rounded"
                      >
                        Feedback
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Cancel this assessment slot?')) {
                            handleUpdateInterviewStatus(int.id, 'Cancelled');
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Cancel Assessment"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
