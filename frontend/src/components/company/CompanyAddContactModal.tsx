import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import AnimatedModal from '../AnimatedModal';

interface CompanyAddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  newContactName: string;
  setNewContactName: (val: string) => void;
  newContactEmail: string;
  setNewContactEmail: (val: string) => void;
  newContactPhone: string;
  setNewContactPhone: (val: string) => void;
  newContactRole: string;
  setNewContactRole: (val: string) => void;
  newContactDept: string;
  setNewContactDept: (val: string) => void;
  newContactIsPrimary: boolean;
  setNewContactIsPrimary: (val: boolean) => void;
  handleAddContactSubmit: (e: React.FormEvent) => void;
}

export function CompanyAddContactModal({
  isOpen,
  onClose,
  newContactName,
  setNewContactName,
  newContactEmail,
  setNewContactEmail,
  newContactPhone,
  setNewContactPhone,
  newContactRole,
  setNewContactRole,
  newContactDept,
  setNewContactDept,
  newContactIsPrimary,
  setNewContactIsPrimary,
  handleAddContactSubmit
}: CompanyAddContactModalProps) {
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
          <form onSubmit={handleAddContactSubmit}>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Add New HR Contact</h4>
              <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Contact Name *</label>
                <input 
                  type="text" 
                  required 
                  value={newContactName} 
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="E.g. Jane Doe"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Designation</label>
                  <input 
                    type="text" 
                    value={newContactRole} 
                    onChange={(e) => setNewContactRole(e.target.value)}
                    placeholder="Talent Acquisition"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Department</label>
                  <select 
                    value={newContactDept} 
                    onChange={(e) => setNewContactDept(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Human Resources">HR / Recruiting</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Executive Office">Management</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Email *</label>
                <input 
                  type="email" 
                  required 
                  value={newContactEmail} 
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="jane.doe@company.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 font-bold">Phone Number</label>
                <input 
                  type="text" 
                  value={newContactPhone} 
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input 
                  type="checkbox" 
                  checked={newContactIsPrimary} 
                  onChange={(e) => setNewContactIsPrimary(e.target.checked)}
                  className="h-4.5 w-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-655 font-bold select-none">Mark as primary account contact</span>
              </label>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={handleClose} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer transition-colors shadow-2xs">
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}
    </AnimatedModal>
  );
}
