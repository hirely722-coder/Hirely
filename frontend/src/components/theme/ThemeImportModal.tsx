import React, { useState, useEffect } from 'react';
import { X, Upload, Download } from 'lucide-react';
import AnimatedModal from '../AnimatedModal';

interface ThemeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importText: string;
  setImportText: (val: string) => void;
  handleImportJson: () => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ThemeImportModal({
  isOpen,
  onClose,
  importText,
  setImportText,
  handleImportJson,
  handleImportFile
}: ThemeImportModalProps) {
  const [open, setOpen] = useState(isOpen);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const onFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImportFile(e);
    // Auto close on select if success
    setTimeout(handleClose, 300);
  };

  return (
    <AnimatedModal isOpen={open} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-200 transform flex flex-col ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <Upload className="h-4.5 w-4.5 text-blue-600" />
              <span className="font-extrabold text-slate-900 text-sm font-sans uppercase">Import Custom Brand Theme</span>
            </div>
            <button 
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs text-slate-655 leading-relaxed overflow-y-auto">
            <p className="font-sans">Paste your theme configuration JSON below, or select a downloaded <code>.json</code> file directly.</p>
            
            <div className="space-y-2">
              {/* File input selector */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={onFileSelectChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Download className="h-6 w-6 text-slate-400 mx-auto mb-1.5 animate-bounce" />
                <p className="font-bold text-slate-800 font-sans">Choose custom-theme.json file</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Click to browse your hard drive</p>
              </div>

              {/* Text area input fallback */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Or paste raw JSON string</label>
                <textarea 
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-36 font-mono text-[10px] p-2.5 border rounded-xl bg-slate-50/50 text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder={`{\n  "name": "Custom Theme",\n  "colors": { ... },\n  "typography": { ... },\n  "layout": { ... }\n}`}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t flex items-center justify-end gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer transition-colors bg-white"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={() => {
                handleImportJson();
                handleClose();
              }}
              disabled={!importText.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer select-none transition-colors"
            >
              Parse & Import
            </button>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
