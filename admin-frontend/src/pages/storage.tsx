import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Database, RefreshCw, HardDrive, CheckCircle2, 
  AlertCircle, ShieldCheck, Download, Trash2
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminStorage() {
  const { showToast } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const loadStorage = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/storage');
      setStats(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load storage stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const handleCleanup = async () => {
    if (!window.confirm('Perform garbage collection? This will permanently delete orphaned candidate resumes that have no matching active candidates.')) return;
    setCleaning(true);
    try {
      const result = await fetchAdminApi('/api/superadmin/storage/cleanup', { method: 'POST' });
      showToast(`✓ Cleanup succeeded! Removed ${result.cleanedFilesCount} files and reclaimed ${result.reclaimedSpaceMb} MB.`, 'success');
      loadStorage();
    } catch (err: any) {
      showToast(err.message || 'Cleanup failed', 'error');
    } finally {
      setCleaning(false);
    }
  };

  if (loading || !stats) {
    return <div className="p-6 text-center text-slate-400">Loading storage configuration...</div>;
  }

  // Calculate percentage used
  const usedPercent = Math.round((stats.usedStorageMb / (stats.usedStorageMb + stats.availableStorageMb)) * 100) || 5;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Storage Management</h1>
          <p className="text-xs text-slate-500 font-medium">Audit S3 bucket limits, analyze candidate resume file sizes, and perform storage optimization.</p>
        </div>
        <button 
          onClick={loadStorage}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Storage Allocation Status card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display mb-1">Global Storage Capacity</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-6">Aggregate tenant resume file storage.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between text-xs font-bold text-slate-700 font-mono">
              <span>{usedPercent}% CAPACITY USED</span>
              <span>{stats.usedStorageMb.toFixed(1)} MB / 10 GB</span>
            </div>
            
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${usedPercent}%` }} />
            </div>

            <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              <span>Used: {stats.usedStorageMb.toFixed(1)} MB</span>
              <span>Available: {stats.availableStorageMb.toFixed(1)} MB</span>
            </div>
          </div>
        </div>

        {/* Cache Garbage collector tool */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display mb-1">Cache Optimization</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-4">Garbage collect orphan uploads.</p>
          </div>

          <div className="space-y-3.5 mt-2 flex-1 flex flex-col justify-center">
            <div className="flex gap-2 text-[10px] font-semibold text-slate-500 leading-normal bg-slate-50 p-3 rounded-2xl">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <span>Scanning for unlinked resume PDFs or profile attachments cached inside bucket database storage.</span>
            </div>
          </div>

          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 mt-4"
          >
            <Trash2 className="h-4 w-4" />
            <span>{cleaning ? 'Reclaiming Cache...' : 'Clean Orphan Resumes'}</span>
          </button>
        </div>

      </div>

      {/* Storage by Agency list & Largest Resume Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Storage by Agency list */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 font-display">Storage Usage by Agency</h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs font-medium">
            {stats.topAgencies.map((agency: any, i: number) => (
              <div key={i} className="flex justify-between items-center px-6 py-4">
                <span className="font-bold text-slate-900 font-display">{agency.agency}</span>
                <div className="flex items-center gap-4 font-mono font-semibold text-slate-500">
                  <span>{agency.files} resumes</span>
                  <span className="text-slate-800">{agency.sizeMb} MB</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Largest Resume Files */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 font-display">Largest Resumes Uploaded</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats.largestFiles.map((file: any) => (
                  <tr key={file.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 max-w-[200px] truncate font-mono text-[11px] text-slate-600">{file.fileName}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 font-display">{file.candidateName}</td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-500">{file.sizeMb} MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
