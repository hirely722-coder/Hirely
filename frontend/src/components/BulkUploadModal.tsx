import React, { useState, useEffect } from 'react';
import { X, Sparkles, Upload, FileText, Loader2, CheckCircle, Edit2, User, Briefcase } from 'lucide-react';
import { BulkResumeItem } from './useCandidatesState';
import AnimatedModal from './AnimatedModal';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewItem: BulkResumeItem | null;
  setReviewItem: (item: BulkResumeItem | null) => void;
  bulkItems: BulkResumeItem[];
  setBulkItems: React.Dispatch<React.SetStateAction<BulkResumeItem[]>>;
  isParsing: boolean;
  parseError: string | null;
  dragActive: boolean;
  parsingStep: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  removeBulkItem: (id: string) => void;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleParseBulkResumes: () => Promise<void>;
  handleImportAllSuccess: () => void;
  handleSaveReviewItem: (updatedData: any) => void;
}

export function BulkUploadModal({
  isOpen,
  onClose,
  reviewItem,
  setReviewItem,
  bulkItems,
  setBulkItems,
  isParsing,
  parseError,
  dragActive,
  parsingStep,
  fileInputRef,
  removeBulkItem,
  handleDrag,
  handleDrop,
  handleFileChange,
  handleParseBulkResumes,
  handleImportAllSuccess,
  handleSaveReviewItem
}: BulkUploadModalProps) {
  const [isOpenLocal, setIsOpenLocal] = useState(isOpen);
  const [activeTab, setActiveTab] = useState<'profile' | 'experience' | 'bio'>('profile');

  useEffect(() => {
    setIsOpenLocal(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (reviewItem) {
      setActiveTab('profile');
    }
  }, [reviewItem]);

  const handleClose = () => {
    setIsOpenLocal(false);
    setTimeout(onClose, 200);
  };

  return (
    <AnimatedModal isOpen={isOpenLocal} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-xl border border-slate-100 shadow-xl max-w-2xl w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {reviewItem ? (
            /* Inline Review/Edit Form for a single parsed item */
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900 font-sans flex items-center gap-1.5">
                  <Edit2 className="h-4 w-4 text-blue-600" />
                  Review Extracted Details: {reviewItem.file.name}
                </h2>
                <button onClick={() => setReviewItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-5 py-2 gap-2 select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 border border-transparent'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Personal Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('experience')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'experience'
                      ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 border border-transparent'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  Experience & Skills
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'bio'
                      ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 border border-transparent'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  AI Bio & Summary
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <p className="text-[11px] text-slate-400 font-sans">
                  Verify and adjust the fields parsed by Hirly before importing.
                </p>

                {activeTab === 'profile' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Candidate Name *</label>
                      <input
                        type="text"
                        required
                        value={reviewItem.extractedData?.name || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), name: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        value={reviewItem.extractedData?.email || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), email: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.phone || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), phone: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Address / Location</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.address || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), address: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'experience' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Current Company</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.currentCompany || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), currentCompany: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Years of Experience</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.experience || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), experience: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Skills (Comma-separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(reviewItem.extractedData?.skills) ? reviewItem.extractedData.skills.join(', ') : reviewItem.extractedData?.skills || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), skills: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Education</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.education || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), education: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'bio' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">AI Generated Resume Summary / Bio</label>
                      <textarea
                        rows={8}
                        value={reviewItem.extractedData?.resumeTextSummary || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), resumeTextSummary: e.target.value } as any
                        })}
                        placeholder="No summary generated. Add or edit candidate bio here..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 leading-relaxed resize-none font-sans min-h-[160px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Back to List
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReviewItem(reviewItem.extractedData)}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* Main Bulk Upload & Status List View */
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                  Bulk AI Resume Parser & Extractor
                </h2>
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start gap-2 leading-relaxed">
                  <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold font-sans">Hirly Bulk Extraction Engine</p>
                    <p className="mt-0.5 font-sans">Upload multiple resume files (PDF, PNG, JPG, or TXT). Hirly parses them in sequence to reconstruct history, skills, contact fields, and let you review and bulk import them seamlessly.</p>
                  </div>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50/30' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,image/png,image/jpeg,image/jpg,text/plain"
                    multiple
                    onChange={handleFileChange}
                  />
                  <Upload className="h-8 w-8 text-slate-400 animate-bounce" />
                  <p className="text-xs font-medium text-slate-700 mt-3 font-sans">Drag and drop your candidate resume files here</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">Supports PDF, PNG, JPEG, JPG, or TXT formats (Upload multiple files at once)</p>
                  <button
                    type="button"
                    className="mt-4 px-3 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                  >
                    Browse Files
                  </button>
                </div>

                {bulkItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono">
                        Files Selected ({bulkItems.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setBulkItems([])}
                        className="text-[10px] text-red-650 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {bulkItems.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-3 text-xs transition-colors ${
                            item.status === 'parsing' 
                              ? 'bg-blue-50/20 border-blue-200' 
                              : item.status === 'success' 
                                ? 'bg-emerald-50/10 border-emerald-100' 
                                : item.status === 'error' 
                                  ? 'bg-red-50/10 border-red-100' 
                                  : 'bg-slate-50/30 border-slate-200/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <FileText className={`h-4 w-4 shrink-0 ${
                                item.status === 'success' ? 'text-emerald-500' : 'text-slate-400'
                              }`} />
                              <div className="overflow-hidden">
                                <p className="font-semibold text-slate-700 truncate font-sans">{item.file.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {(item.file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.status === 'pending' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/50">
                                  Ready
                                </span>
                              )}
                              {item.status === 'parsing' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Parsing
                                </span>
                              )}
                              {item.status === 'success' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  Parsed ✓
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span 
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 cursor-help"
                                  title={item.errorMessage}
                                >
                                  Error ✗
                                </span>
                              )}

                              {item.status === 'success' && item.extractedData && (
                                <button
                                  type="button"
                                  onClick={() => setReviewItem(item)}
                                  className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 rounded text-[10px] font-semibold transition-all cursor-pointer"
                                >
                                  Review
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => removeBulkItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-605 hover:bg-slate-100 rounded cursor-pointer"
                                title="Remove"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {item.status === 'success' && item.extractedData && (
                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                              <div>
                                <strong className="text-slate-700 font-medium">Extracted:</strong> {item.extractedData.name} ({item.extractedData.email || 'No email'})
                              </div>
                              <div className="truncate max-w-[200px]">
                                {item.extractedData.experience} • {item.extractedData.currentCompany}
                              </div>
                            </div>
                          )}

                          {item.status === 'error' && item.errorMessage && (
                            <div className="mt-1.5 text-[9px] text-red-600 font-mono">
                              Error: {item.errorMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isParsing && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="text-xs font-semibold text-slate-700 font-sans">{parsingStep}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-2/3" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">Hirly is structuring skills, education, experience, and contact info in parallel.</p>
                  </div>
                )}

                {parseError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium font-sans">
                    {parseError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50">
                <div>
                  {bulkItems.some(i => i.status === 'success') && (
                    <span className="text-xs text-slate-500 font-sans font-medium">
                      ✓ {bulkItems.filter(i => i.status === 'success').length} files parsed successfully. Ready to import.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  
                  {bulkItems.some(i => i.status === 'pending' || i.status === 'error') && (
                    <button
                      type="button"
                      disabled={isParsing}
                      onClick={handleParseBulkResumes}
                      className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Parse All with AI
                        </>
                      )}
                    </button>
                  )}

                  {bulkItems.some(i => i.status === 'success') && (
                    <button
                      type="button"
                      disabled={isParsing}
                      onClick={handleImportAllSuccess}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Import {bulkItems.filter(i => i.status === 'success').length} Candidates
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatedModal>
  );
}
