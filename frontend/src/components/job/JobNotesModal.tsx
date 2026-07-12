import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { JobNote } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface JobNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote: JobNote | null;
  noteText: string;
  setNoteText: (text: string) => void;
  handleSaveNote: (e: React.FormEvent) => void;
}

export function JobNotesModal({
  isOpen,
  onClose,
  editingNote,
  noteText,
  setNoteText,
  handleSaveNote
}: JobNotesModalProps) {
  const [isOpenLocal, setIsOpenLocal] = useState(isOpen);

  useEffect(() => {
    setIsOpenLocal(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpenLocal(false);
    setTimeout(onClose, 200);
  };

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
            <h3 className="text-xs font-bold text-slate-900 font-sans">
              {editingNote ? 'Modify Recruiting Note' : 'Add Internal Team Note'}
            </h3>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSaveNote} className="p-4 space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Recruiter Notes Text</label>
              <textarea
                required
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="E.g., Candidate impressed the backend coordinator. Expected salary fits. Solid reference letters."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50/30"
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
                className="px-4 py-1.5 text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 rounded shadow-xs cursor-pointer"
              >
                {editingNote ? 'Save Update' : 'Publish Note'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AnimatedModal>
  );
}
