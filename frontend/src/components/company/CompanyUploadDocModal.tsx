import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import AnimatedModal from '../AnimatedModal';

interface CompanyUploadDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleManualUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CompanyUploadDocModal({
  isOpen,
  onClose,
  dragActive,
  handleDrag,
  handleDrop,
  handleManualUpload
}: CompanyUploadDocModalProps) {
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
          className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-200 transform p-6 space-y-4 ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
            <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Upload Workspace Document</h4>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/20'
            }`}
          >
            <Upload className="h-8 w-8 text-slate-305 mx-auto animate-bounce" />
            <p className="text-xs font-semibold text-slate-600 mt-2 font-sans">Drag and drop file here</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Mock Supabase Storage upload, supporting up to 50MB</p>
            <label className="mt-4 inline-block">
              <span className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer select-none">
                Browse Files
              </span>
              <input type="file" onChange={handleManualUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
