import React from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { Candidate, EmailTemplate } from '../../types';
import { JobNote, JobCommunication, JobActivity } from '../../utils/jobMockData';

interface JobLogsTabProps {
  activeTab: 'notes' | 'communication' | 'activity';
  candidates: Candidate[];
  filteredNotes: JobNote[];
  filteredCommunications: JobCommunication[];
  activities: JobActivity[];
  emailTemplates: EmailTemplate[];
  setEditingNote: (note: JobNote | null) => void;
  setNoteText: (text: string) => void;
  setShowNoteModal: (show: boolean) => void;
  handleEditNoteStart: (note: JobNote) => void;
  handleDeleteNote: (id: string) => void;
  handleApplyTemplate: (template: EmailTemplate, cand: Candidate) => void;
}

export function JobLogsTab({
  activeTab,
  candidates,
  filteredNotes,
  filteredCommunications,
  activities,
  emailTemplates,
  setEditingNote,
  setNoteText,
  setShowNoteModal,
  handleEditNoteStart,
  handleDeleteNote,
  handleApplyTemplate
}: JobLogsTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* NOTES SUB-TAB */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-bold text-slate-900">Internal Recruiter Notes</h3>
            <button 
              onClick={() => {
                setEditingNote(null);
                setNoteText('');
                setShowNoteModal(true);
              }}
              className="px-2.5 py-1 text-[10px] font-semibold bg-slate-950 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Note Item
            </button>
          </div>

          <div className="space-y-3.5">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">
                No internal notes recorded.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div key={note.id} className="border border-slate-100 bg-slate-50/60 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-slate-700">{note.author}</span>
                    <div className="flex items-center gap-2">
                      <span>{note.timestamp}</span>
                      <button onClick={() => handleEditNoteStart(note)} className="text-slate-400 hover:text-slate-900" title="Edit note text">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteNote(note.id)} className="text-slate-400 hover:text-rose-600" title="Delete note">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">{note.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* COMMUNICATION HISTORY SUB-TAB */}
      {activeTab === 'communication' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Candidate Interaction History</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Logs and template outreach records corresponding to this job.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">Templates:</span>
              <select 
                onChange={(e) => {
                  const template = emailTemplates.find(t => t.id === e.target.value);
                  if (template && candidates[0]) {
                    handleApplyTemplate(template, candidates[0]);
                  }
                  e.target.value = '';
                }}
                className="text-[10px] border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none"
              >
                <option value="">Resend using Templates...</option>
                {emailTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b">
                  <th className="p-3">Interaction Date</th>
                  <th className="p-3 text-center">Format</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Sent By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCommunications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No recorded interactions matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredCommunications.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-500">{comm.date}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          comm.type === 'Email' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {comm.type}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-mono text-emerald-600 uppercase font-semibold">{comm.status}</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-bold text-slate-900">{comm.candidateName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{comm.recipient}</p>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium truncate max-w-48" title={comm.message}>
                        {comm.subject}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">{comm.sentBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OPERATIONS CHRONOLOGICAL AUDIT Feed TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-bold text-slate-900">Chronological Job Audit Feed</h3>
            <span className="text-[10px] text-slate-400 font-mono">Operations Tracker</span>
          </div>

          <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-5 py-2">
            {activities.map((act) => (
              <div key={act.id} className="relative space-y-1">
                <span className="absolute -left-[20.5px] top-1 h-3 w-3 rounded-full border border-white bg-slate-900 ring-4 ring-slate-100" />
                
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="font-bold text-slate-700">{act.user}</span>
                  <span>•</span>
                  <span>{act.timestamp}</span>
                  <span>•</span>
                  <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[9px] text-slate-600 font-semibold">{act.type}</span>
                </div>
                <p className="text-xs text-slate-700 font-sans leading-relaxed">{act.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
