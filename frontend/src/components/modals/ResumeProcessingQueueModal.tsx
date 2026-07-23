import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle2, AlertCircle, Trash2, RefreshCw, X, ShieldCheck, 
  Sparkles, CheckSquare, Square, Download, ExternalLink, ArrowRight, UserCheck
} from 'lucide-react';
import AnimatedModal from '../AnimatedModal';
import { supabase } from '../../utils/supabase';

export interface ResumeQueueItem {
  id: string;
  workspaceId: string;
  attachmentName: string;
  attachmentSize?: number;
  senderEmail: string;
  senderName?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  designation?: string;
  docType: string;
  confidenceScore: number;
  confidenceTier: 'High' | 'Medium' | 'Low';
  parseStatus: string;
  duplicateStatus: string;
  existingCandidateId?: string;
  existingCandidateName?: string;
  importStatus: string;
  contentUrl?: string;
  createdAt: string;
}

interface ResumeProcessingQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function ResumeProcessingQueueModal({
  isOpen,
  onClose,
  showToast
}: ResumeProcessingQueueModalProps) {
  const [items, setItems] = useState<ResumeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterTier, setFilterTier] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending Review' | 'Imported' | 'Ignored'>('All');

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
    }
  }, [isOpen]);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/resume-queue`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setItems(data.queue || []);
      }
    } catch (err) {
      console.warn('[ResumeQueueModal] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const selectable = filteredItems.filter(i => i.importStatus !== 'Auto Imported' && i.importStatus !== 'Manually Imported');
    if (selectedIds.length === selectable.length && selectable.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map(i => i.id));
    }
  };

  const handleSingleImport = async (id: string, name?: string) => {
    try {
      setIsProcessing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/resume-queue/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ids: [id] })
      });

      if (res.ok) {
        showToast(`✓ Candidate ${name || ''} successfully imported into Hirely Candidates!`, 'success');
        fetchQueue();
      }
    } catch (err: any) {
      showToast(`❌ Import failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImport = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsProcessing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/resume-queue/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        showToast(`✓ Imported ${selectedIds.length} candidate resumes into Hirely Candidates!`, 'success');
        setSelectedIds([]);
        fetchQueue();
      }
    } catch (err: any) {
      showToast(`❌ Bulk import failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkIgnore = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsProcessing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/resume-queue/bulk-ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        showToast(`Updated ${selectedIds.length} queue items to Ignored`, 'success');
        setSelectedIds([]);
        fetchQueue();
      }
    } catch (err: any) {
      showToast(`❌ Bulk ignore failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeCandidate = async (id: string, targetCandidateId?: string, candidateName?: string) => {
    try {
      setIsProcessing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/resume-queue/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, targetCandidateId })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`✓ Resume attachment merged into ${data.candidateName || candidateName || 'existing candidate'} profile notes!`, 'success');
        fetchQueue();
      }
    } catch (err: any) {
      showToast(`❌ Merge failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = items.filter(i => {
    if (filterTier !== 'All' && i.confidenceTier !== filterTier) return false;
    if (filterStatus === 'Pending Review') return i.importStatus === 'Pending Review';
    if (filterStatus === 'Imported') return i.importStatus === 'Auto Imported' || i.importStatus === 'Manually Imported';
    if (filterStatus === 'Ignored') return i.importStatus === 'Ignored';
    return true;
  });

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose}>
      {(animate) => (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-2xl overflow-hidden font-sans border border-slate-200/80 shadow-2xl flex flex-col max-h-[85vh] w-full max-w-4xl transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Intelligent Resume Processing Queue</h3>
                <p className="text-xs text-slate-500">AI-detected resume attachments & automated candidate import queue</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Toolbar & Filter Tabs */}
          <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {selectedIds.length === filteredItems.filter(i => i.importStatus !== 'Auto Imported' && i.importStatus !== 'Manually Imported').length && selectedIds.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                Select All ({filteredItems.length})
              </button>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={isProcessing}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Import Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkIgnore}
                    disabled={isProcessing}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Ignore Selected
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['All', 'Pending Review', 'Imported', 'Ignored'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      filterStatus === st 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Confidence Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['All', 'High', 'Medium', 'Low'] as const).map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setFilterTier(tier)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      filterTier === tier 
                        ? 'bg-white text-slate-900 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Queue Items Table / List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-600" />
                Scanning resume processing queue...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-800 text-sm">No resume items in {filterStatus} filter</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Attachments received via IMAP are analyzed automatically by AI and sorted into High/Medium confidence tiers.
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const isAlreadyImported = item.importStatus === 'Auto Imported' || item.importStatus === 'Manually Imported';

                return (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl transition-all flex items-center justify-between gap-4 ${
                      isAlreadyImported 
                        ? 'bg-emerald-50/40 border border-emerald-100' 
                        : isSelected ? 'bg-purple-50/60 border border-purple-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={isAlreadyImported}
                        onClick={() => handleToggleSelect(item.id)}
                        className={`cursor-pointer ${isAlreadyImported ? 'opacity-40 cursor-not-allowed text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {isSelected ? <CheckSquare className="h-4 w-4 text-purple-600" /> : <Square className="h-4 w-4" />}
                      </button>

                      <div className={`p-2.5 rounded-xl shrink-0 ${isAlreadyImported ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        <FileText className={`h-5 w-5 ${isAlreadyImported ? 'text-emerald-600' : 'text-purple-600'}`} />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.candidateName || item.attachmentName}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded font-mono">
                            {item.docType}
                          </span>
                          {isAlreadyImported ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded font-mono flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {item.duplicateStatus === 'Merged' ? 'Merged' : 'Imported'}
                            </span>
                          ) : item.duplicateStatus === 'Possible Duplicate' || item.existingCandidateName ? (
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-700 shrink-0" />
                              ⚠️ Possible Duplicate (Existing Candidate: {item.existingCandidateName || 'Matches Profile'})
                            </span>
                          ) : item.duplicateStatus === 'Updated' || item.duplicateStatus === 'Duplicate Found' ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded font-mono">
                              {item.duplicateStatus}
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-500 truncate">
                          File: <span className="font-semibold text-slate-700">{item.attachmentName}</span> • Sender: {item.senderEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg font-mono ${
                          item.confidenceTier === 'High' ? 'bg-emerald-100 text-emerald-800' :
                          item.confidenceTier === 'Medium' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.confidenceScore}% {item.confidenceTier}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{item.importStatus}</p>
                      </div>

                      {!isAlreadyImported && (
                        <>
                          {item.duplicateStatus === 'Possible Duplicate' || item.existingCandidateName ? (
                            <button
                              type="button"
                              onClick={() => handleMergeCandidate(item.id, item.existingCandidateId, item.existingCandidateName)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Merge attachment into existing candidate timeline notes"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Merge to Existing
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSingleImport(item.id, item.candidateName)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Import
                            </button>
                          )}
                        </>
                      )}

                      {item.contentUrl && (
                        <a
                          href={item.contentUrl}
                          download={item.attachmentName}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download Attachment"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
