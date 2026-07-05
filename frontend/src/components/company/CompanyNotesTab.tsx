import React from 'react';
import { Plus } from 'lucide-react';
import { Note } from '../../utils/companyMockData';

interface CompanyNotesTabProps {
  filteredNotes: Note[];
  showAddNoteModal: boolean;
  setShowAddNoteModal: React.Dispatch<React.SetStateAction<boolean>>;
  newNoteContent: string;
  setNewNoteContent: (val: string) => void;
  handleAddNoteSubmit: (e: React.FormEvent) => void;
}

export function CompanyNotesTab({
  filteredNotes,
  showAddNoteModal,
  setShowAddNoteModal,
  newNoteContent,
  setNewNoteContent,
  handleAddNoteSubmit
}: CompanyNotesTabProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 font-sans">Internal Recruiter Notes</h3>
        <button 
          onClick={() => setShowAddNoteModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Note
        </button>
      </div>

      {/* Note form */}
      {showAddNoteModal && (
        <form onSubmit={handleAddNoteSubmit} className="p-4 border border-slate-205 rounded-2xl bg-slate-50 space-y-3 animate-slide-up shadow-inner">
          <p className="text-xs font-bold text-slate-800 font-sans">Add recruiter partnership notes</p>
          <textarea 
            rows={3}
            required
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Enter important hiring constraints, salary negotiability, or client feedback..."
            className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setShowAddNoteModal(false)}
              className="px-3 py-1 text-xs border border-slate-200 text-slate-600 rounded cursor-pointer font-semibold bg-white hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-3.5 py-1 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded cursor-pointer transition-colors shadow-2xs"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Timeline Notes view */}
      <div className="relative border-l border-slate-200 pl-5 ml-1.5 space-y-6">
        {filteredNotes.length === 0 ? (
          <p className="text-slate-400 text-xs pl-2 italic">No custom notes stored yet.</p>
        ) : (
          filteredNotes.map(n => (
            <div key={n.id} className="relative group">
              <div className="absolute -left-[24.5px] top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
              <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2 shadow-2xs">
                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">{n.content}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-50">
                  <span>Created by <strong className="font-semibold text-slate-600">{n.author}</strong></span>
                  <span>{n.timestamp}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
