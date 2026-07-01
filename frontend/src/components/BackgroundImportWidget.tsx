import React, { useState } from 'react';
import { 
  Play, Pause, Square, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronDown, 
  ChevronUp, Download, Eye, ExternalLink, RefreshCw, X, Minimize2, Maximize2, Ban
} from 'lucide-react';
import { ImportTask, ErrorLog } from '../utils/importEngine';

interface BackgroundImportWidgetProps {
  task: ImportTask;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClose: () => void;
  onViewResults: () => void;
  onDownloadReport: () => void;
  onMaximize?: () => void;
}

export default function BackgroundImportWidget({
  task,
  onPause,
  onResume,
  onCancel,
  onClose,
  onViewResults,
  onDownloadReport,
  onMaximize
}: BackgroundImportWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showErrorLogs, setShowErrorLogs] = useState(false);

  const progressPercent = (task?.totalRows ?? 0) > 0 
    ? Math.round((((task?.importedCount ?? 0) + (task?.failedCount ?? 0) + (task?.skippedCount ?? 0)) / task.totalRows) * 100) 
    : 0;

  const currentProcessed = (task?.importedCount ?? 0) + (task?.failedCount ?? 0) + (task?.skippedCount ?? 0);

  // Render minimized floating bubble/pill
  if (isMinimized) {
    return (
      <div 
        id="bg-import-widget-min"
        className="fixed bottom-5 right-5 z-[9999] bg-slate-900 border border-slate-800 text-white rounded-full pl-4 pr-2 py-2 flex items-center gap-3 shadow-xl hover:shadow-2xl cursor-pointer select-none animate-slide-in transition-all"
        onClick={() => {
          if (onMaximize) {
            onMaximize();
          } else {
            setIsMinimized(false);
          }
        }}
      >
        <div className="flex items-center gap-2">
          {task.status === 'processing' ? (
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          ) : task.status === 'paused' ? (
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          ) : task.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span className="text-[11px] font-bold tracking-tight">
            {task.status === 'completed' 
              ? 'Import completed!' 
              : task.status === 'paused' 
              ? 'Import Paused' 
              : `Importing... ${progressPercent}%`
            }
          </span>
        </div>
        
        {/* Progress Circular Accent */}
        <div className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-mono font-bold text-slate-300 flex items-center gap-1.5">
          <span>{currentProcessed}/{task.totalRows}</span>
          <Maximize2 className="h-3 w-3 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div 
      id="bg-import-widget-full"
      className="fixed bottom-5 right-5 z-[9999] bg-white border border-slate-200 w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up transition-all"
    >
      {/* Header Widget Layout */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4.5 w-4.5 text-blue-400" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold truncate pr-2 max-w-[150px]">{task.fileName}</h3>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono font-bold">{task.importType} Import</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onMaximize && (
            <button 
              onClick={onMaximize}
              title="Open Full Import Wizard"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button 
            onClick={() => setIsMinimized(true)}
            title="Minimize to Tray"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          {(task.status === 'completed' || task.status === 'failed') && (
            <button 
              onClick={onClose}
              title="Close Widget"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bars & Info */}
      <div className="p-4 space-y-4">
        {/* Status indicator and quick action */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold">
            {task.status === 'processing' && (
              <>
                <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                <span className="text-blue-700 font-bold">Importing Records</span>
              </>
            )}
            {task.status === 'paused' && (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-600 font-bold">Import Paused</span>
              </>
            )}
            {task.status === 'completed' && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Completed Successfully</span>
              </>
            )}
            {task.status === 'failed' && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                <span className="text-rose-700 font-bold">Import Failed</span>
              </>
            )}
          </div>
          
          {/* Active Control Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {task.status === 'processing' && (
              <button 
                onClick={onPause}
                title="Pause Import"
                className="p-1 hover:bg-white text-slate-600 rounded-md transition-all cursor-pointer"
              >
                <Pause className="h-3 w-3" />
              </button>
            )}
            {task.status === 'paused' && (
              <button 
                onClick={onResume}
                title="Resume Import"
                className="p-1 bg-white text-blue-600 shadow-3xs rounded-md transition-all cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
              </button>
            )}
            {['processing', 'paused'].includes(task.status) && (
              <button 
                onClick={onCancel}
                title="Stop & Save current progress"
                className="p-1 hover:bg-white text-rose-600 rounded-md transition-all cursor-pointer"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            )}
          </div>
        </div>

        {/* Big Progress HUD */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
            <span>{currentProcessed} / {task.totalRows}</span>
            <span className="text-blue-600">{progressPercent}%</span>
          </div>
          
          <div className="w-full bg-slate-150 rounded-full h-2 overflow-hidden border border-slate-250/20">
            <div 
              className={`h-full transition-all duration-300 ${
                task.status === 'completed' 
                  ? 'bg-emerald-500' 
                  : task.status === 'paused' 
                  ? 'bg-amber-400' 
                  : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center text-[10px]">
          <div>
            <span className="block font-bold text-slate-800 text-[11px]">{task.speed} /s</span>
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Speed</span>
          </div>
          <div>
            <span className="block font-bold text-slate-800 text-[11px]">
              {task.status === 'completed' 
                ? '0s' 
                : task.estimatedTimeRemaining > 0 
                ? `${task.estimatedTimeRemaining}s` 
                : 'Calcul...'
              }
            </span>
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Remaining</span>
          </div>
          <div>
            <span className="block font-bold text-slate-800 text-[11px]">
              {task.currentChunk} / {task.totalChunks}
            </span>
            <span className="text-slate-400 uppercase tracking-wider font-semibold">Chunk</span>
          </div>
        </div>

        {/* Row Counters details */}
        <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-semibold font-mono">
          <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-lg p-1.5">
            <span className="block text-xs font-bold">{task.importedCount}</span>
            <span className="text-[8px] text-emerald-500 uppercase tracking-wide">Success</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 text-amber-800 rounded-lg p-1.5">
            <span className="block text-xs font-bold">{task.duplicateCount}</span>
            <span className="text-[8px] text-amber-500 uppercase tracking-wide">Dupe</span>
          </div>
          <div className="bg-rose-50/50 border border-rose-100 text-rose-800 rounded-lg p-1.5">
            <span className="block text-xs font-bold">{task.failedCount}</span>
            <span className="text-[8px] text-rose-500 uppercase tracking-wide">Failed</span>
          </div>
          <div className="bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-1.5">
            <span className="block text-xs font-bold">{task.skippedCount}</span>
            <span className="text-[8px] text-slate-400 uppercase tracking-wide">Skipped</span>
          </div>
        </div>

        {/* Real-time Validation Error Log HUD */}
        {Array.isArray(task?.errorLogs) && task.errorLogs.length > 0 && (
          <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/30">
            <button 
              onClick={() => setShowErrorLogs(!showErrorLogs)}
              className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer select-none border-b border-slate-150"
            >
              <span className="flex items-center gap-1.5 text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Live Validation Logs ({task.errorLogs.length})
              </span>
              {showErrorLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showErrorLogs && (
              <div className="max-h-32 overflow-y-auto divide-y divide-slate-150 p-1 font-mono text-[9px] bg-white">
                {task.errorLogs.slice(-10).map((log, lIdx) => (
                  <div key={lIdx} className="p-1.5 space-y-0.5">
                    <div className="flex items-center justify-between text-rose-700">
                      <span>Row #{log?.row ?? ''}</span>
                      <span className="font-bold">{log?.reason ?? ''}</span>
                    </div>
                    {log?.value && <p className="text-slate-400 truncate">Value: "{log.value}"</p>}
                    <p className="text-slate-500 text-[8px] font-sans">Fix: {log?.fix ?? ''}</p>
                  </div>
                ))}
                {task.errorLogs.length > 10 && (
                  <p className="p-1.5 text-center text-slate-400">...and {task.errorLogs.length - 10} older logs</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Summary Options upon Completion */}
        {(task.status === 'completed' || task.status === 'failed') && (
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              onClick={onDownloadReport}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Report
            </button>
            <button
              onClick={onViewResults}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-3xs transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-blue-150" />
              View Records
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
