import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, 
  ChevronRight, Info, Play, Check, Database, Columns, RefreshCw, Save, Trash2,
  FileText, Pause, AlertTriangle, ShieldCheck, Loader2, Sparkles, Settings, ExternalLink,
  ChevronLeft, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Company, Job, Candidate } from '../types';
import { parseCSV, CSV_TEMPLATES, FIELD_MAPPINGS, normalizeHeader } from '../utils/csvParser';
import { 
  saveMappingTemplate, getMappingTemplates, deleteMappingTemplate, 
  validateRecord, ImportTask, MappingTemplate, cleanSkills,
  getImportHistory, ImportHistoryItem
} from '../utils/importEngine';

// Header mapping matching algorithm
function smartMatchHeaders(headers: string[], mappings: Record<string, string[]>, importType: string): Record<string, number> {
  const initialMap: Record<string, number> = {};
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  const usedIndices = new Set<number>();

  const normAlias = (alias: string) => normalizeHeader(alias);

  // Stage 1: Exact matches
  Object.entries(mappings).forEach(([field, aliases]) => {
    const matchedIdx = normalizedHeaders.findIndex((normH, idx) => {
      if (usedIndices.has(idx)) return false;
      return aliases.some(alias => normH === normAlias(alias));
    });

    if (matchedIdx !== -1) {
      initialMap[field] = matchedIdx;
      usedIndices.add(matchedIdx);
    }
  });

  // Stage 2: Starts with or ends with
  Object.entries(mappings).forEach(([field, aliases]) => {
    if (initialMap[field] !== undefined && initialMap[field] !== -1) return;

    const matchedIdx = normalizedHeaders.findIndex((normH, idx) => {
      if (usedIndices.has(idx)) return false;
      if (normH.length < 3) return false;
      return aliases.some(alias => {
        const nAlias = normAlias(alias);
        if (nAlias.length < 3) return false;
        return normH.startsWith(nAlias) || normH.endsWith(nAlias);
      });
    });

    if (matchedIdx !== -1) {
      initialMap[field] = matchedIdx;
      usedIndices.add(matchedIdx);
    }
  });

  // Stage 3: Contains matches
  Object.entries(mappings).forEach(([field, aliases]) => {
    if (initialMap[field] !== undefined && initialMap[field] !== -1) return;

    const matchedIdx = normalizedHeaders.findIndex((normH, idx) => {
      if (usedIndices.has(idx)) return false;
      return aliases.some(alias => {
        const nAlias = normAlias(alias);
        if (nAlias.length < 3) return false;
        
        // Prevent false positives
        if (normH === 'date' && (field === 'name' || field === 'candidatename')) {
          return false;
        }
        
        return normH.includes(nAlias);
      });
    });

    if (matchedIdx !== -1) {
      initialMap[field] = matchedIdx;
      usedIndices.add(matchedIdx);
    } else {
      initialMap[field] = -1; // Unmapped
    }
  });

  // Fill default unmapped fields
  Object.keys(mappings).forEach(field => {
    if (initialMap[field] === undefined) {
      initialMap[field] = -1;
    }
  });

  return initialMap;
}

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  jobs: Job[];
  onAddCompany: (c: Company) => void;
  onAddJob: (j: Job) => void;
  onAddCandidate: (cand: Candidate) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
  initialType?: 'companies' | 'jobs' | 'candidates';
  onStartBackgroundImport: (
    fileName: string,
    importType: 'companies' | 'jobs' | 'candidates',
    rawHeaders: string[],
    rawRows: string[][],
    columnMap: Record<string, number>,
    defaultValues: Record<string, string>,
    duplicateStrategy: 'skip' | 'update' | 'create'
  ) => void;
  activeImportTask?: ImportTask | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onDownloadReport?: () => void;
  onViewResults?: () => void;
  onRollbackImport?: (importId: string) => void;
}

// Strictly 6 steps for Import Wizard
type Step = 'upload' | 'preview' | 'mapping' | 'validation' | 'importing' | 'summary';

export default function CSVImportModal({
  isOpen,
  onClose,
  companies,
  jobs,
  onAddCompany,
  onAddJob,
  onAddCandidate,
  showToast,
  initialType = 'candidates',
  onStartBackgroundImport,
  activeImportTask,
  onPause,
  onResume,
  onCancel,
  onDownloadReport,
  onViewResults,
  onRollbackImport
}: CSVImportModalProps) {
  const [importType, setImportType] = useState<'companies' | 'jobs' | 'candidates'>(initialType);
  const [step, setStep] = useState<Step>('upload');
  const [subTab, setSubTab] = useState<'new' | 'history'>('new');
  
  // File upload configurations & states
  const [maxFileSize, setMaxFileSize] = useState<number>(20); // configurable limit in MB
  const [detectedEncoding, setDetectedEncoding] = useState<string>('UTF-8 (Autodetect)');
  const [dragActive, setDragActive] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [totalFileRowsCount, setTotalFileRowsCount] = useState(0);
  const [detectedFileType, setDetectedFileType] = useState('');
  
  // Entire parsed spreadsheet database
  const [allRawHeaders, setAllRawHeaders] = useState<string[]>([]);
  const [allRawRows, setAllRawRows] = useState<string[][]>([]);

  // Memory-efficient preview contents (Strictly first 20 rows)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  // Column mapping states
  const [columnMap, setColumnMap] = useState<Record<string, number>>({});
  
  // Saved Templates Management
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [showSaveTemplateForm, setShowSaveTemplateForm] = useState(false);

  // Pre-import validation options
  const [skipRowsWithErrors, setSkipRowsWithErrors] = useState(true);
  const [skipRowsWithWarnings, setSkipRowsWithWarnings] = useState(false);

  // Advanced default fallbacks & duplicate strategies
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'create'>('skip');
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({
    source: 'Excel Import',
    recruiterName: 'Sarah Jenkins',
    status: 'Applied',
    pipelineStage: 'Applied',
    tags: 'Imported'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize wizard step if there is an active background process
  useEffect(() => {
    if (activeImportTask) {
      if (activeImportTask.status === 'completed' || activeImportTask.status === 'failed') {
        setStep('summary');
      } else if (activeImportTask.status === 'processing' || activeImportTask.status === 'paused') {
        setStep('importing');
      }
    }
  }, [activeImportTask]);

  // Load Saved templates on mount or registry type change
  useEffect(() => {
    setSavedTemplates(getMappingTemplates().filter(t => t.importType === importType));
  }, [importType]);

  const [historyItems, setHistoryItems] = useState<ImportHistoryItem[]>([]);
  useEffect(() => {
    if (isOpen) {
      setHistoryItems(getImportHistory());
    }
  }, [isOpen, subTab]);

  if (!isOpen) return null;

  // Template layout downloader
  const handleDownloadTemplate = () => {
    const templateData = CSV_TEMPLATES[importType];
    const csvContent = templateData.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${importType}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Downloaded blank template for ${importType}!`, 'success');
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Memory Efficient Excel/CSV Parsing Engine
  const handleFile = async (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv';

    if (!isExcel && !isCSV) {
      showToast('Please upload a valid CSV or Excel (.xlsx, .xls) file.', 'error');
      return;
    }

    // Configurable size limitation check
    const sizeInMB = file.size / 1024 / 1024;
    if (sizeInMB > maxFileSize) {
      showToast(`File size is ${sizeInMB.toFixed(1)}MB, exceeding your configured maximum size limit of ${maxFileSize}MB.`, 'error');
      return;
    }

    setFileName(file.name);
    setFileSizeStr(sizeInMB > 1 ? `${sizeInMB.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`);
    setDetectedFileType(isExcel ? 'Excel Spreadsheet (.xlsx / .xls)' : 'Comma-Separated Values (.csv)');
    setDetectedEncoding(isExcel ? 'Binary / OpenXML' : 'UTF-8 (Autodetect)');

    try {
      if (isExcel) {
        const fullDataBuffer = await file.arrayBuffer();
        
        // 1. Memory-efficient load: Parse only first 25 rows for sandbox preview
        const previewWorkbook = XLSX.read(fullDataBuffer, { 
          type: 'array', 
          cellDates: true, 
          sheetRows: 25 
        });
        const firstSheetName = previewWorkbook.SheetNames[0];
        if (!firstSheetName) {
          showToast('Excel sheet is empty!', 'error');
          return;
        }

        const previewWorksheet = previewWorkbook.Sheets[firstSheetName];
        const previewRaw = XLSX.utils.sheet_to_json<any[]>(previewWorksheet, { header: 1 });
        if (previewRaw.length === 0) {
          showToast('The Excel sheet contains no rows.', 'error');
          return;
        }

        // Find true header row
        let headerRowIdx = 0;
        while (headerRowIdx < previewRaw.length) {
          const row = previewRaw[headerRowIdx];
          if (row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
            break;
          }
          headerRowIdx++;
        }

        const rawHeaders = (previewRaw[headerRowIdx] || []).map(cell => String(cell ?? '').trim());
        const previewRowsParsed = previewRaw.slice(headerRowIdx + 1)
          .filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
          .map(row => 
            rawHeaders.map((_, colIdx) => {
              const cell = row[colIdx];
              if (cell instanceof Date) {
                return cell.toISOString().split('T')[0];
              }
              return cell !== null && cell !== undefined ? String(cell).trim() : '';
            })
          );

        setPreviewHeaders(rawHeaders);
        setPreviewRows(previewRowsParsed.slice(0, 20)); // Memory boundary

        // 2. Load entire sheet in background
        const fullWorkbook = XLSX.read(fullDataBuffer, { type: 'array', cellDates: true });
        const fullWorksheet = fullWorkbook.Sheets[firstSheetName];
        const fullRaw = XLSX.utils.sheet_to_json<any[]>(fullWorksheet, { header: 1 });
        const fullRowsParsed = fullRaw.slice(headerRowIdx + 1)
          .filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
          .map(row => 
            rawHeaders.map((_, colIdx) => {
              const cell = row[colIdx];
              if (cell instanceof Date) {
                return cell.toISOString().split('T')[0];
              }
              return cell !== null && cell !== undefined ? String(cell).trim() : '';
            })
          );

        setAllRawHeaders(rawHeaders);
        setAllRawRows(fullRowsParsed);
        setTotalFileRowsCount(fullRowsParsed.length);

        // Pre-fill columns map with heuristics
        const initialMap = smartMatchHeaders(rawHeaders, FIELD_MAPPINGS[importType], importType);
        setColumnMap(initialMap);

        // Advance to Preview
        setStep('preview');
      } else {
        // CSV loader
        const text = await file.text();
        processRawCSVText(text);
      }
    } catch (err) {
      console.error(err);
      showToast('Error analyzing spreadsheet layers.', 'error');
    }
  };

  const processRawCSVText = (text: string) => {
    if (!text.trim()) {
      showToast('Spreadsheet contains no text.', 'error');
      return;
    }

    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      showToast('Empty CSV file!', 'error');
      return;
    }

    let headerRowIdx = 0;
    while (headerRowIdx < parsed.length) {
      const row = parsed[headerRowIdx];
      if (row && row.some(cell => cell && cell.trim() !== '')) {
        break;
      }
      headerRowIdx++;
    }

    if (headerRowIdx >= parsed.length) {
      showToast('No valid header cells detected.', 'error');
      return;
    }

    const headers = parsed[headerRowIdx].map(h => h.trim());
    const dataRows = parsed.slice(headerRowIdx + 1)
      .filter(row => row && row.some(cell => cell && cell.trim() !== ''))
      .map(row => 
        headers.map((_, colIdx) => {
          const cell = row[colIdx];
          return cell !== undefined && cell !== null ? cell.trim() : '';
        })
      );

    setAllRawHeaders(headers);
    setAllRawRows(dataRows);
    setTotalFileRowsCount(dataRows.length);

    // Limit preview to first 20 rows
    setPreviewHeaders(headers);
    setPreviewRows(dataRows.slice(0, 20));

    // Smart Match Headers
    const initialMap = smartMatchHeaders(headers, FIELD_MAPPINGS[importType], importType);
    setColumnMap(initialMap);

    setStep('preview');
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      showToast('Please paste valid CSV snippet data.', 'error');
      return;
    }
    setFileName('Pasted_Client_Data.csv');
    setFileSizeStr('Unknown (Paste Buffer)');
    setDetectedFileType('Text Snippet Stream (.csv)');
    setDetectedEncoding('UTF-8 (Autodetect)');
    processRawCSVText(pastedText);
  };

  const handleLoadSampleDataset = () => {
    const templateData = CSV_TEMPLATES[importType];
    const csvContent = templateData.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    setPastedText(csvContent);
    setFileName(`Staffing_Sample_${importType}_Data.csv`);
    setFileSizeStr('12 KB');
    setDetectedFileType('Sandbox CSV Dataset (.csv)');
    setDetectedEncoding('UTF-8 (Mock)');
    processRawCSVText(csvContent);
    showToast('✓ Loaded sandbox ATS testing spreadsheet!', 'success');
  };

  // Saved Template Handlers
  const handleApplyTemplate = (tplId: string) => {
    const tpl = savedTemplates.find(t => t.id === tplId);
    if (tpl) {
      setColumnMap(tpl.mapping);
      setSelectedTemplateId(tplId);
      showToast(`✓ Applied "${tpl.name}" mapping template!`, 'success');
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      showToast('Please specify a template name.', 'error');
      return;
    }
    const tpl = saveMappingTemplate({
      name: newTemplateName.trim(),
      importType,
      mapping: columnMap
    });
    setSavedTemplates(prev => [tpl, ...prev]);
    setSelectedTemplateId(tpl.id);
    setNewTemplateName('');
    setShowSaveTemplateForm(false);
    showToast(`✓ Saved mapping template: "${tpl.name}"`, 'success');
  };

  const handleDeleteTemplate = (tplId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMappingTemplate(tplId);
    setSavedTemplates(prev => prev.filter(t => t.id !== tplId));
    if (selectedTemplateId === tplId) {
      setSelectedTemplateId('');
    }
    showToast('Removed custom template.', 'success');
  };

  // Full Pre-Import validation diagnostic calculations on the ENTIRE file rows
  const validationDiagnostics = useMemo(() => {
    if (!allRawRows || !Array.isArray(allRawRows) || allRawRows.length === 0) return { totalErrors: 0, totalWarnings: 0, errorList: [], warningList: [], validRowsCount: 0 };
    
    const mockEmailsSet = new Set<string>();
    const mockPhonesSet = new Set<string>();
    
    let totalErrors = 0;
    let totalWarnings = 0;
    const errorList: any[] = [];
    const warningList: any[] = [];
    let validRowsCount = 0;

    allRawRows.forEach((row, idx) => {
      const record: Record<string, any> = {};
      Object.entries(columnMap || {}).forEach(([field, colIdx]) => {
        const index = colIdx as number;
        record[field] = (row && index !== -1) ? (row[index] ?? '') : '';
      });

      const { errors, warnings } = validateRecord(record, importType, idx + 1, mockEmailsSet, mockPhonesSet);
      
      if (errors.length > 0) {
        totalErrors += errors.length;
        errorList.push(...errors);
      }
      if (warnings.length > 0) {
        totalWarnings += warnings.length;
        warningList.push(...warnings);
      }
      if (errors.length === 0) {
        validRowsCount++;
      }
    });

    return {
      totalErrors,
      totalWarnings,
      errorList,
      warningList,
      validRowsCount
    };
  }, [allRawRows, columnMap, importType]);

  // Generates a pre-import diagnostics spreadsheet
  const handleDownloadPreImportValidationReport = () => {
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      ['Pre-Import Sanitization Report', ''],
      ['File Checked', fileName],
      ['Import Type Scope', importType],
      ['Total Records Count', totalFileRowsCount],
      ['Valid Rows', validationDiagnostics.validRowsCount],
      ['Critical Errors Found', validationDiagnostics.totalErrors],
      ['Non-critical Warnings Found', validationDiagnostics.totalWarnings],
      ['Deduplication Plan', duplicateStrategy === 'skip' ? 'Skip' : duplicateStrategy === 'update' ? 'Update Existing' : 'Create Secondary Profiles']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Diagnostics Overview');

    if (validationDiagnostics.errorList.length > 0 || validationDiagnostics.warningList.length > 0) {
      const issuesHeader = ['Row Number', 'Severity', 'Field', 'Parsed Value', 'Issue Reason', 'Suggested Fix Action'];
      const issuesRows = [
        ...validationDiagnostics.errorList.map(err => [err.row, 'CRITICAL ERROR', err.field, err.value, err.reason, err.fix]),
        ...validationDiagnostics.warningList.map(warn => [warn.row, 'WARNING FLAG', warn.field, warn.value, warn.reason, warn.fix])
      ];
      // sort by row index
      issuesRows.sort((a, b) => (a[0] as number) - (b[0] as number));
      const wsIssues = XLSX.utils.aoa_to_sheet([issuesHeader, ...issuesRows]);
      XLSX.utils.book_append_sheet(wb, wsIssues, 'Errors and Warnings Log');
    }

    const fileBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${importType}_preimport_validation_diagnostics.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported high-fidelity pre-import Excel validation diagnostics!', 'success');
  };

  // Launch Background chunk processor
  const handleTriggerBackgroundImport = () => {
    // If we choose to skip invalid rows with errors, we let the background import engine know.
    // We adjust rawRows to automatically exclude errors if skipRowsWithErrors is true.
    let preparedRows = allRawRows;
    if (skipRowsWithErrors && validationDiagnostics.totalErrors > 0) {
      const rowsWithCriticalErrors = new Set(validationDiagnostics.errorList.map(e => e.row));
      preparedRows = allRawRows.filter((_, idx) => !rowsWithCriticalErrors.has(idx + 1));
      showToast(`Automatically skipped ${rowsWithCriticalErrors.size} rows with validation errors!`, 'success');
    }

    onStartBackgroundImport(
      fileName,
      importType,
      allRawHeaders,
      preparedRows,
      columnMap,
      defaultValues,
      duplicateStrategy
    );
  };

  const handleResetWizard = () => {
    setStep('upload');
    setFileName('');
    setFileSizeStr('');
    setAllRawRows([]);
    setAllRawHeaders([]);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setPastedText('');
  };

  const progressPercent = activeImportTask && activeImportTask.totalRows > 0 
    ? Math.round(((activeImportTask.importedCount + activeImportTask.failedCount + activeImportTask.skippedCount) / activeImportTask.totalRows) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" id="import-wizard-container">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-150 overflow-hidden animate-slide-up">
        
        {/* TOP HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-sans">Enterprise Bulk Importer</h2>
              <p className="text-[10px] text-slate-400">Memory-efficient streaming background importer, cleaner, and validation engine.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* PROGRESS METRICS WIZARD STEPS */}
        <div className="flex border-b border-slate-100 px-6 py-2 bg-slate-50 text-[10px] text-slate-400 font-bold tracking-tight select-none overflow-x-auto gap-1">
          {[
            { key: 'upload', label: '1. Upload File' },
            { key: 'preview', label: '2. Preview Data' },
            { key: 'mapping', label: '3. Smart Column Mapping' },
            { key: 'validation', label: '4. Validation Check' },
            { key: 'importing', label: '5. Background Import' },
            { key: 'summary', label: '6. Import Summary' }
          ].map((s, idx) => {
            const isCurrent = step === s.key;
            const stepOrder = ['upload', 'preview', 'mapping', 'validation', 'importing', 'summary'];
            const isPast = stepOrder.indexOf(step) > stepOrder.indexOf(s.key);

            return (
              <React.Fragment key={s.key}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-300 self-center mx-1" />}
                <span className={`py-1 rounded-md px-2 flex items-center gap-1 ${
                  isCurrent ? 'text-blue-600 bg-blue-50/50 font-extrabold' : 
                  isPast ? 'text-slate-800 font-bold' : 'text-slate-350'
                }`}>
                  {isPast && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                  {s.label}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* CONTENT PANELS */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/30">
          
          {/* STEP 1: UPLOAD FILE & REGISTRY DESTINATION */}
          {step === 'upload' && (
            <div className="space-y-6 animate-fade-in max-w-3xl mx-auto py-2">
              <div className="flex justify-center border-b border-slate-200 gap-6">
                <button
                  onClick={() => setSubTab('new')}
                  className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    subTab === 'new'
                      ? 'border-blue-600 text-blue-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📁 Start New Bulk Import
                </button>
                <button
                  onClick={() => setSubTab('history')}
                  className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    subTab === 'history'
                      ? 'border-blue-600 text-blue-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📜 Import History & Rollbacks
                </button>
              </div>

              {subTab === 'new' ? (
                <>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">Select Registry & Upload Spreadsheet</h3>
                    <p className="text-xs text-slate-500">Pick which database folder the spreadsheet will match, then drop your file.</p>
                  </div>

                  {/* Destination selector */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { key: 'candidates', title: 'Candidates Cohort', icon: '👥', desc: 'Resumes, emails, cellphones, skills tags.' },
                      { key: 'companies', title: 'Companies Registry', icon: '🏢', desc: 'Partner companies, account levels, size.' },
                      { key: 'jobs', title: 'Job Career Openings', icon: '💼', desc: 'Client requirements, salaries, urgency.' }
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setImportType(item.key as any)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer ${
                          importType === item.key ? 'border-blue-500 ring-2 ring-blue-50 bg-white font-semibold' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-lg">{item.icon}</div>
                          <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Upload settings config block */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Configurable Max File Size Limit</label>
                      <select 
                        value={maxFileSize}
                        onChange={(e) => setMaxFileSize(parseInt(e.target.value))}
                        className="w-full text-xs mt-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700"
                      >
                        <option value={10}>10 MB Limit</option>
                        <option value={20}>20 MB Limit (Standard)</option>
                        <option value={50}>50 MB Limit (Large File)</option>
                        <option value={100}>100 MB Limit (Bulk)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Sandbox Sandbox Helpers</label>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={handleDownloadTemplate}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-slate-600 bg-white cursor-pointer"
                        >
                          <Download className="h-3 w-3 text-slate-400" />
                          Download Blank CSV
                        </button>
                        <button
                          onClick={handleLoadSampleDataset}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer"
                        >
                          <Play className="h-3 w-3 text-emerald-400" />
                          Load Sample Data
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all ${
                        dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileInput} 
                        accept=".csv,.xlsx,.xls" 
                        className="hidden" 
                      />
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Drag & drop spreadsheet here</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">or click to browse local folders</p>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded border">Supports CSV, XLSX, XLS up to {maxFileSize}MB</span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 bg-white">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 font-sans">Pasted Spreadsheet Snippet</h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Copy cells directly from Google Sheets or Excel and paste below.</p>
                      </div>
                      
                      <textarea
                        rows={3}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Name,Email,Phone,Experience&#10;John Doe,john@doe.com,555-0199,5 Years&#10;Jane Smith,jane@smith.com,555-0210,3 Years"
                        className="w-full p-2.5 text-[10px] font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 text-slate-700 resize-none"
                      />

                      <button
                        onClick={handlePasteSubmit}
                        disabled={!pastedText.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Analyze Paste Stream
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">Audit History & Rollback System</h3>
                    <p className="text-xs text-slate-500">Every bulk import record is tracked and logged. You can rollback entire imports without affecting other data.</p>
                  </div>

                  {historyItems.length === 0 ? (
                    <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2 justify-center">
                      <Database className="h-8 w-8 text-slate-350" />
                      <span>No bulk import history found. Start your first import!</span>
                    </div>
                  ) : (
                    <div className="bg-white border rounded-xl overflow-hidden shadow-3xs max-h-[450px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-55 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">Import Date / File</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Total Rows</th>
                            <th className="p-3">Success / Skip / Fail</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                              <td className="p-3">
                                <div className="font-bold text-slate-700 font-mono text-[11px] truncate max-w-[180px]" title={item.fileName}>
                                  {item.fileName}
                                </div>
                                <span className="text-[10px] text-slate-400 block">{item.date}</span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-600">
                                  {item.importType}
                                </span>
                              </td>
                              <td className="p-3 font-semibold font-mono text-slate-600">
                                {item.totalRows}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2 text-[10px] font-mono font-bold">
                                  <span className="text-emerald-600 font-extrabold" title="Successfully Saved">
                                    +{item.importedCount}
                                  </span>
                                  <span className="text-slate-400" title="Skipped / Duplicates">
                                    /{item.skippedCount}
                                  </span>
                                  <span className="text-rose-600" title="Failed validation">
                                    /{item.failedCount}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono block">
                                  Dur: {item.duration}s | Speed: {item.speed} rec/s
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  item.status === 'processing' ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse' :
                                  item.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  item.status === 'rolled_back' ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {item.status === 'completed' && 'Completed'}
                                  {item.status === 'processing' && 'Processing'}
                                  {item.status === 'paused' && 'Paused'}
                                  {item.status === 'rolled_back' && 'Rolled Back'}
                                  {item.status === 'cancelled' && 'Stopped'}
                                  {item.status === 'failed' && 'Failed'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {item.status === 'completed' ? (
                                  <button
                                    onClick={() => {
                                      if (onRollbackImport) {
                                        if (confirm(`Are you absolutely sure you want to rollback import "${item.fileName}"?\n\nThis will safely delete only the ${item.importedCount} records created by this import, and won't affect any other system data.`)) {
                                          onRollbackImport(item.id);
                                          // Refresh local list
                                          setHistoryItems(getImportHistory());
                                        }
                                      } else {
                                        showToast('Rollback is not available from this context.', 'error');
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white rounded font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 ml-auto"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Rollback
                                  </button>
                                ) : item.status === 'rolled_back' ? (
                                  <span className="text-[10px] text-slate-400 font-semibold font-mono">Rolled Back</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW DATA */}
          {step === 'preview' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white border rounded-xl p-3 shadow-3xs flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Selected File</p>
                    <p className="text-[11px] font-bold text-slate-700 truncate" title={fileName}>{fileName}</p>
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-3xs flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                    <Settings className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Format & Encoding</p>
                    <p className="text-[11px] font-bold text-slate-700">{detectedEncoding}</p>
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-3xs flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Detected Records</p>
                    <p className="text-[11px] font-bold text-slate-700">{totalFileRowsCount} total rows</p>
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-3 shadow-3xs flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Memory Mode</p>
                    <p className="text-[11px] font-bold text-emerald-700 font-sans">Low-Memory Safeguard</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs flex items-start gap-2 text-blue-800">
                <Info className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Lazy-Load Preview Mode (Showing strictly first 20 records)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    We parsed structural headers and metadata in {fileSizeStr} and loaded a 20-row preview. 
                    The remaining {totalFileRowsCount > 20 ? totalFileRowsCount - 20 : 0} rows are staged in safe chunk buffers to prevent browser memory freezing.
                  </p>
                </div>
              </div>

              {/* Spreadsheet table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-[11px] border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-mono font-extrabold uppercase sticky top-0">
                        <th className="p-2.5 border-r border-slate-150 w-12 text-center bg-slate-50">Row</th>
                        {previewHeaders.map((header, idx) => (
                          <th key={idx} className="p-2.5 border-r border-slate-150 font-semibold min-w-[130px] truncate bg-slate-50">
                            {header || `Col ${idx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/30 text-slate-600 font-medium">
                          <td className="p-2 border-r border-slate-150 bg-slate-50/40 text-center font-mono font-bold text-slate-400">#{rIdx + 1}</td>
                          {previewHeaders.map((_, colIdx) => (
                            <td key={colIdx} className="p-2 border-r border-slate-150 truncate max-w-[170px]" title={row[colIdx]}>
                              {row[colIdx] || <span className="text-slate-300">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SMART COLUMN ALIGNMENT */}
          {step === 'mapping' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl p-3.5 gap-4 text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">Smart Mapping Rules</h4>
                  <p className="text-slate-500 text-[11px]">Auto-mapping completed via semantic header heuristics. Adjust manually or use saved templates.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  {savedTemplates.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Preset:</span>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleApplyTemplate(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none bg-slate-50 font-medium text-slate-700"
                      >
                        <option value="">-- Apply Template --</option>
                        {savedTemplates.map(tpl => (
                          <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!showSaveTemplateForm ? (
                    <button
                      onClick={() => setShowSaveTemplateForm(true)}
                      className="flex items-center gap-1 px-3 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-slate-600 bg-white cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5 text-slate-400" />
                      Save Mapping Layout
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-slate-50 p-1 border rounded-lg">
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="Naukri, Old ATS, Excel..."
                        className="text-xs px-2 py-0.5 border rounded bg-white focus:outline-none text-slate-700"
                      />
                      <button
                        onClick={handleCreateTemplate}
                        className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 text-xs cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowSaveTemplateForm(false)}
                        className="px-1.5 py-0.5 border rounded text-slate-500 hover:bg-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Column alignment table layout */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
                <div className="grid grid-cols-12 bg-slate-50 text-[10px] font-extrabold text-slate-400 font-mono p-2.5 uppercase tracking-wider border-b sticky top-0">
                  <div className="col-span-4">ATS System Field</div>
                  <div className="col-span-5">Mapped Spreadsheet Column</div>
                  <div className="col-span-3 text-right">Row #1 Sample Value</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {Object.keys(FIELD_MAPPINGS[importType]).map(field => {
                    const isRequired = 
                      (importType === 'companies' && field === 'name') ||
                      (importType === 'jobs' && ['title', 'companyName'].includes(field)) ||
                      (importType === 'candidates' && ['name', 'email'].includes(field));

                    const currentMappedIdx = columnMap[field] ?? -1;
                    const sampleVal = (currentMappedIdx !== -1 && previewRows[0]) 
                      ? previewRows[0][currentMappedIdx] 
                      : '—';

                    return (
                      <div key={field} className="grid grid-cols-12 items-center p-2.5 text-xs hover:bg-slate-50/30">
                        <div className="col-span-4 flex items-center gap-1.5 pr-2">
                          <span className="font-bold text-slate-800 capitalize">
                            {field.replace(/([A-Z])/g, ' $1')}
                          </span>
                          {isRequired && (
                            <span className="text-[8px] font-extrabold text-rose-500 bg-rose-50 border border-rose-100 px-1 rounded uppercase">Required</span>
                          )}
                        </div>

                        <div className="col-span-5">
                          <select
                            value={currentMappedIdx}
                            onChange={(e) => {
                              setColumnMap(prev => ({
                                ...prev,
                                [field]: parseInt(e.target.value)
                              }));
                            }}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none bg-white font-medium text-slate-700"
                          >
                            <option value={-1}>[ Do Not Import ]</option>
                            {previewHeaders.map((header, idx) => (
                              <option key={idx} value={idx}>
                                {header} (Col {idx + 1})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3 text-right text-[11px] font-mono text-slate-500 truncate pl-3" title={sampleVal}>
                          {sampleVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PRE-IMPORT FULL SHEET VALIDATION & DIAGNOSTICS */}
          {step === 'validation' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 shadow-3xs flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase font-mono">100% Valid Clean Rows</p>
                    <p className="text-[15px] font-extrabold text-slate-800">{validationDiagnostics.validRowsCount} / {totalFileRowsCount}</p>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 shadow-3xs flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <X className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-rose-600 uppercase font-mono">Critical Sanitization Errors</p>
                    <p className="text-[15px] font-extrabold text-slate-800">{validationDiagnostics.totalErrors}</p>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 shadow-3xs flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-amber-600 uppercase font-mono">Non-critical Warnings</p>
                    <p className="text-[15px] font-extrabold text-slate-800">{validationDiagnostics.totalWarnings}</p>
                  </div>
                </div>
              </div>

              {/* Interactive skipping preferences */}
              <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={skipRowsWithErrors}
                      onChange={(e) => setSkipRowsWithErrors(e.target.checked)}
                      className="accent-blue-600 h-4 w-4"
                    />
                    <span>Automatically skip rows with critical errors during import</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={skipRowsWithWarnings}
                      onChange={(e) => setSkipRowsWithWarnings(e.target.checked)}
                      className="accent-blue-600 h-4 w-4"
                    />
                    <span>Skip or quarantine rows with duplicate/warnings</span>
                  </label>
                </div>

                <div className="flex flex-col justify-center items-end">
                  <button
                    onClick={handleDownloadPreImportValidationReport}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 text-xs shadow-xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    Download Pre-Import Diagnostics Report
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium font-sans">Review all spreadsheet anomalies before importing in bulk.</p>
                </div>
              </div>

              {/* Scrollable list of specific identified warnings/errors */}
              <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-3xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b text-[10px] text-slate-400 font-extrabold uppercase font-mono">
                  Diagnostics Anomalies Feed
                </div>
                
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto p-2 space-y-1">
                  {validationDiagnostics.errorList.length === 0 && validationDiagnostics.warningList.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1 font-semibold">
                      <ShieldCheck className="h-8 w-8 text-emerald-500" />
                      Congratulations! No validation errors or warning anomalies found.
                    </div>
                  ) : (
                    <>
                      {validationDiagnostics.errorList.map((err, idx) => (
                        <div key={`err-${idx}`} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-xs flex gap-2.5 items-start">
                          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-800">Critical Error — Row {err.row}: </span>
                            <span className="text-slate-700">{err.reason} in column <strong className="uppercase">{err.field}</strong></span>
                            <p className="text-[10px] text-slate-500 mt-1"><span className="font-bold text-slate-700">Recommended fix:</span> {err.fix}</p>
                          </div>
                        </div>
                      ))}
                      {validationDiagnostics.warningList.map((warn, idx) => (
                        <div key={`warn-${idx}`} className="p-2.5 bg-amber-50/40 border border-amber-100 rounded-lg text-xs flex gap-2.5 items-start">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-800">Warning Flag — Row {warn.row}: </span>
                            <span className="text-slate-700">{warn.reason} in column <strong className="uppercase">{warn.field}</strong> ({warn.value || 'null'})</span>
                            <p className="text-[10px] text-slate-500 mt-1"><span className="font-bold text-slate-700">Recommended action:</span> {warn.fix}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: BACKGROUND IMPORT PROGRESS DASHBOARD */}
          {step === 'importing' && activeImportTask && (
            <div className="space-y-5 animate-fade-in py-4 max-w-2xl mx-auto">
              <div className="text-center space-y-1">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto animate-spin">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Streaming Excel / CSV Data Chunks</h3>
                <p className="text-xs text-slate-400">Processing background queue independently using thread-safe non-blocking batch micro-tasks.</p>
              </div>

              {/* Progress and indicators */}
              <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 text-blue-500 animate-spin" /> Batch Progress:</span>
                  <span className="font-mono">{activeImportTask.importedCount + activeImportTask.failedCount + activeImportTask.skippedCount} / {activeImportTask.totalRows} ({progressPercent}%)</span>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-center text-xs font-bold">
                  <div className="bg-emerald-50/50 border rounded-lg p-2.5">
                    <span className="block text-emerald-800 text-sm font-extrabold">{activeImportTask.importedCount}</span>
                    <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Saved</span>
                  </div>
                  <div className="bg-amber-50/50 border rounded-lg p-2.5">
                    <span className="block text-amber-800 text-sm font-extrabold">{activeImportTask.duplicateCount}</span>
                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Duplicates</span>
                  </div>
                  <div className="bg-rose-50/50 border rounded-lg p-2.5">
                    <span className="block text-rose-800 text-sm font-extrabold">{activeImportTask.failedCount}</span>
                    <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">Failed</span>
                  </div>
                  <div className="bg-slate-50 border rounded-lg p-2.5">
                    <span className="block text-slate-800 text-sm font-extrabold">{activeImportTask.skippedCount}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Skipped</span>
                  </div>
                </div>

                {/* Micro speed indices */}
                <div className="border-t pt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-400 font-mono">
                  <div>
                    <span>CURRENT SPEED</span>
                    <p className="text-slate-700 font-extrabold mt-0.5 text-xs">{activeImportTask.speed} rows/sec</p>
                  </div>
                  <div>
                    <span>CHUNK BATCHES</span>
                    <p className="text-slate-700 font-extrabold mt-0.5 text-xs">{activeImportTask.currentChunk + 1} of {activeImportTask.totalChunks}</p>
                  </div>
                  <div>
                    <span>EST. TIME REMAINING</span>
                    <p className="text-slate-700 font-extrabold mt-0.5 text-xs">{activeImportTask.estimatedTimeRemaining} seconds</p>
                  </div>
                </div>
              </div>

              {/* Pause / Resume Controls inside Full-Screen Importer */}
              <div className="flex items-center justify-center gap-3">
                {activeImportTask.status === 'processing' ? (
                  <button
                    onClick={onPause}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    <Pause className="h-4 w-4" />
                    Pause Stream
                  </button>
                ) : (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    <Play className="h-4 w-4" />
                    Resume Stream
                  </button>
                )}

                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  <X className="h-4 w-4" />
                  Stop Import
                </button>

                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  <ExternalLink className="h-4 w-4 text-blue-400" />
                  Minimize & Run in Background
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: IMPORT SUMMARY REPORT CARD */}
          {step === 'summary' && activeImportTask && (
            <div className="space-y-5 animate-fade-in py-4 max-w-2xl mx-auto">
              <div className="text-center space-y-1">
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Bulk Background Import Completed!</h3>
                <p className="text-xs text-slate-400">Your candidate portfolio database was updated successfully.</p>
              </div>

              <div className="bg-white border rounded-2xl p-6 shadow-xs space-y-4 grid grid-cols-2 gap-4">
                <div className="col-span-2 text-center border-b pb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wide">Processed File Name</p>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 font-mono">{activeImportTask.fileName}</h4>
                </div>

                <div className="space-y-3 font-semibold text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Spreadsheet Rows:</span>
                    <strong className="text-slate-800 font-mono">{activeImportTask.totalRows}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Successfully Saved:</span>
                    <strong className="text-emerald-600 font-mono">+{activeImportTask.importedCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Validation Errors Skipped:</span>
                    <strong className="text-rose-600 font-mono">{activeImportTask.failedCount}</strong>
                  </div>
                </div>

                <div className="space-y-3 font-semibold text-xs text-slate-600 border-l pl-4">
                  <div className="flex justify-between">
                    <span>Duplicate Logged:</span>
                    <strong className="text-amber-600 font-mono">{activeImportTask.duplicateCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Duration:</span>
                    <strong className="text-slate-800 font-mono">{Math.round(activeImportTask.elapsedTime / 1000)} seconds</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Throughput Speed:</span>
                    <strong className="text-slate-800 font-mono">{activeImportTask.speed} rows / sec</strong>
                  </div>
                </div>
              </div>

              {/* Finishing steps */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={onDownloadReport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 text-xs shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  Download Sanitization Error Log
                </button>

                <button
                  onClick={() => {
                    if (onViewResults) onViewResults();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Newly Imported Records
                </button>

                <button
                  onClick={handleResetWizard}
                  className="flex items-center gap-1.5 px-4 py-2 border hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer bg-white shadow-3xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM STEP CONTROLS FOOTER */}
        {step !== 'importing' && step !== 'summary' && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              {step !== 'upload' && (
                <button
                  onClick={() => {
                    if (step === 'preview') setStep('upload');
                    else if (step === 'mapping') setStep('preview');
                    else if (step === 'validation') setStep('mapping');
                  }}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-white rounded-lg cursor-pointer transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {step === 'preview' && (
                <button
                  onClick={() => setStep('mapping')}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors animate-pulse"
                >
                  Configure Smart Mapping
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {step === 'mapping' && (
                <button
                  onClick={() => setStep('validation')}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                >
                  Run Validation Diagnostics
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {step === 'validation' && (
                <button
                  onClick={handleTriggerBackgroundImport}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-100 cursor-pointer transition-colors"
                >
                  <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" />
                  Begin Background Import
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
