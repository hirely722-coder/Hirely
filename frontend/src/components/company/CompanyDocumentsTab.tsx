import React from 'react';
import { Plus, Upload, Download, Trash } from 'lucide-react';
import { CompanyDocument } from '../../types';

interface CompanyDocumentsTabProps {
  filteredDocuments: CompanyDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<CompanyDocument[]>>;
  setShowUploadDocModal: React.Dispatch<React.SetStateAction<boolean>>;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleManualUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showLocalToast: (text: string, type: 'success' | 'error') => void;
}

export function CompanyDocumentsTab({
  filteredDocuments,
  setDocuments,
  setShowUploadDocModal,
  dragActive,
  handleDrag,
  handleDrop,
  handleManualUpload,
  showLocalToast
}: CompanyDocumentsTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-900 font-sans">Stored Workspace Documents</h3>
        <button 
          onClick={() => setShowUploadDocModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Upload File
        </button>
      </div>

      {/* Custom file Dropzone mockup */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/30'
        }`}
      >
        <Upload className="h-8 w-8 text-slate-300 mx-auto animate-bounce" />
        <p className="text-xs font-semibold text-slate-655 mt-2 font-sans">Drag and drop agreement files, NDA, or JDs here</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Mock Supabase Storage upload, supporting up to 50MB</p>
        <label className="mt-4 inline-block">
          <span className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer select-none">
            Browse Files
          </span>
          <input type="file" onChange={handleManualUpload} className="hidden" />
        </label>
      </div>

      {/* Stored docs list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocuments.map(doc => (
          <div key={doc.id} className="p-3.5 border border-slate-200 rounded-xl bg-white flex items-center justify-between hover:shadow-xs transition-shadow shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 font-sans border border-indigo-100">
                {doc.type}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs leading-tight font-sans">{doc.title}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Uploaded on {doc.dateAdded} • {doc.size}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => showLocalToast(`Downloading ${doc.title} from Supabase Storage bucket...`, 'success')}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-50 cursor-pointer"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              <button 
                onClick={() => {
                  setDocuments(prev => prev.filter(d => d.id !== doc.id));
                  showLocalToast(`Deleted ${doc.title}`, 'error');
                }}
                className="p-1.5 text-slate-400 hover:text-red-650 rounded hover:bg-slate-50 cursor-pointer"
                title="Delete"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
