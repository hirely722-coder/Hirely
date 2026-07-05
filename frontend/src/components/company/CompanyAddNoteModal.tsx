import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import AnimatedModal from '../AnimatedModal';

interface CompanyAddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  newNoteContent: string;
  setNewNoteContent: (val: string) => void;
  handleAddNoteSubmit: (e: React.FormEvent) => void;
}

export function CompanyAddNoteModal({
  isOpen,
  onClose,
  newNoteContent,
  setNewNoteContent,
  handleAddNoteSubmit
}: CompanyAddNoteModalProps) {
  const [open, setOpen] = useState(isOpen);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  return (
    <AnimatedModal isOpen={open} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleAddNoteSubmit}>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Create Recruiter Note</h4>
              <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Partnership constraints & evaluations</label>
                <textarea 
                  rows={4} 
                  required 
                  value={newNoteContent} 
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record client requirements, salary negotiability, or meeting summaries..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-sans"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={handleClose} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer transition-colors shadow-2xs">
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}
    </AnimatedModal>
  );
}
