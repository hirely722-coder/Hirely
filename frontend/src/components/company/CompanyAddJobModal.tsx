import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import AnimatedModal from '../AnimatedModal';

interface CompanyAddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  newJobTitle: string;
  setNewJobTitle: (val: string) => void;
  newJobLocation: string;
  setNewJobLocation: (val: string) => void;
  newJobExp: string;
  setNewJobExp: (val: string) => void;
  newJobSalary: string;
  setNewJobSalary: (val: string) => void;
  newJobDesc: string;
  setNewJobDesc: (val: string) => void;
  newJobSkills: string;
  setNewJobSkills: (val: string) => void;
  handleAddJobSubmit: (e: React.FormEvent) => void;
}

export function CompanyAddJobModal({
  isOpen,
  onClose,
  newJobTitle,
  setNewJobTitle,
  newJobLocation,
  setNewJobLocation,
  newJobExp,
  setNewJobExp,
  newJobSalary,
  setNewJobSalary,
  newJobDesc,
  setNewJobDesc,
  newJobSkills,
  setNewJobSkills,
  handleAddJobSubmit
}: CompanyAddJobModalProps) {
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
          className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleAddJobSubmit}>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Create Open Job Opening</h4>
              <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Job Title *</label>
                <input 
                  type="text" 
                  required 
                  value={newJobTitle} 
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="Senior React Developer, Staff QA Engineer..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Location</label>
                  <input 
                    type="text" 
                    value={newJobLocation} 
                    onChange={(e) => setNewJobLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Experience</label>
                  <input 
                    type="text" 
                    value={newJobExp} 
                    onChange={(e) => setNewJobExp(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Salary Range</label>
                  <input 
                    type="text" 
                    value={newJobSalary} 
                    onChange={(e) => setNewJobSalary(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Required Skills (Comma-separated)</label>
                <input 
                  type="text" 
                  value={newJobSkills} 
                  onChange={(e) => setNewJobSkills(e.target.value)}
                  placeholder="React, TypeScript, Redux, Node.js"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Job Description</label>
                <textarea 
                  rows={3} 
                  value={newJobDesc} 
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  placeholder="Summarize the core mandates & credentials of the opening..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-sans"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={handleClose} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer transition-colors shadow-2xs">
                Create Vacancy
              </button>
            </div>
          </form>
        </div>
      )}
    </AnimatedModal>
  );
}
