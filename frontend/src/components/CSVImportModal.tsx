import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, 
  ChevronRight, Info, Play, Check, Database, Columns, RefreshCw, Trash2,
  FileText, Pause, AlertTriangle, ShieldCheck, Loader2, Sparkles, ChevronLeft,
  ChevronUp, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Company, Job, Candidate, CustomFieldDefinition } from '../types';
import { parseCSV, CSV_TEMPLATES, FIELD_MAPPINGS } from '../utils/csvParser';
import { useApp } from '../context/AppContext';
import AnimatedModal from './AnimatedModal';
import Portal from './Portal';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  jobs: Job[];
  showToast: (text: string, type: 'success' | 'error') => void;
  initialType?: 'companies' | 'jobs' | 'candidates';
  onAddCompany?: (c: Company) => void;
  onAddJob?: (j: Job) => void;
  onAddCandidate?: (cand: Candidate) => void;
  onStartBackgroundImport: (
    fileName: string,
    importType: 'companies' | 'jobs' | 'candidates',
    rawHeaders: string[],
    rawRows: string[][],
    columnMap: Record<string, number>,
    defaultValues: Record<string, string>,
    duplicateStrategy: 'skip' | 'update' | 'create'
  ) => void;
  activeImportTask?: any;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onDownloadReport?: () => void;
  onViewResults?: () => void;
  onRollbackImport?: any;
}

interface SuggestedCustomField {
  csvHeader: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  options?: string[];
  confirmed: boolean;
}

export default function CSVImportModal({
  isOpen,
  onClose,
  companies,
  jobs,
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
  const { handleAddCustomFieldDef, customFieldDefinitions } = useApp();

  const [isOpenLocal, setIsOpenLocal] = useState(true);
  const handleClose = () => {
    setIsOpenLocal(false);
    setTimeout(onClose, 200);
  };

  const [importType, setImportType] = useState<'companies' | 'jobs' | 'candidates'>(initialType);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'summary'>('upload');
  
  // File data
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [totalFileRowsCount, setTotalFileRowsCount] = useState(0);

  const [allRawHeaders, setAllRawHeaders] = useState<string[]>([]);
  const [allRawRows, setAllRawRows] = useState<string[][]>([]);

  // AI mapping states
  const [mappings, setMappings] = useState<Record<string, string>>({}); // CSV Header -> Platform field
  const [sessionCustomFields, setSessionCustomFields] = useState<SuggestedCustomField[]>([]);
  
  // Manual Inline Creator states
  const [editingCustomFieldHeader, setEditingCustomFieldHeader] = useState<string | null>(null);
  const [manualFieldName, setManualFieldName] = useState('');
  const [manualFieldType, setManualFieldType] = useState<'text' | 'number' | 'date' | 'boolean' | 'dropdown'>('text');
  const [manualFieldOptions, setManualFieldOptions] = useState('');
  const [showErrorLogs, setShowErrorLogs] = useState(false);

  // Sync manual creator inputs when header changes
  useEffect(() => {
    if (editingCustomFieldHeader) {
      const existing = sessionCustomFields.find(cf => cf.csvHeader === editingCustomFieldHeader);
      if (existing) {
        setManualFieldName(existing.name);
        setManualFieldType(existing.type);
        setManualFieldOptions(existing.options?.join(', ') || '');
      } else {
        setManualFieldName(editingCustomFieldHeader);
        setManualFieldType('text');
        setManualFieldOptions('');
      }
    }
  }, [editingCustomFieldHeader, sessionCustomFields]);

  // Validation warnings helper
  const getFieldWarning = (key: string, val: string): string | null => {
    if (!val) return null;
    if (key === 'email' && !val.includes('@')) {
      return "Sample value doesn't look like a valid email address.";
    }
    if (key === 'phone' && /[a-zA-Z]{3,}/.test(val)) {
      return "Sample value contains letters, which is unexpected for phone numbers.";
    }
    if (key === 'appliedDate' && isNaN(Date.parse(val)) && !/^\d{4}-\d{2}-\d{2}$/.test(val) && !/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      if (val.toLowerCase() !== 'empty' && val.trim() !== '') {
        return "Sample value might not be in a standard date format.";
      }
    }
    return null;
  };


  // Options
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'create'>('skip');
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({
    source: 'Spreadsheet Import',
    status: 'Pool',
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

  // Drag & Drop handlers
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

  // Parse Excel / CSV
  const handleFile = async (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv';

    if (!isExcel && !isCSV) {
      showToast('Please upload a valid CSV or Excel (.xlsx, .xls) file.', 'error');
      return;
    }

    const sizeInMB = file.size / 1024 / 1024;
    setFileName(file.name);
    setFileSizeStr(sizeInMB > 1 ? `${sizeInMB.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`);

    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      if (isExcel) {
        const fullDataBuffer = await file.arrayBuffer();
        const fullWorkbook = XLSX.read(fullDataBuffer, { type: 'array', cellDates: true });
        const firstSheetName = fullWorkbook.SheetNames[0];
        const fullWorksheet = fullWorkbook.Sheets[firstSheetName];
        const fullRaw = XLSX.utils.sheet_to_json<any[]>(fullWorksheet, { header: 1 });
        
        if (fullRaw.length === 0) {
          showToast('The Excel sheet contains no rows.', 'error');
          return;
        }

        headers = (fullRaw[0] || []).map(cell => String(cell ?? '').trim());
        rows = fullRaw.slice(1)
          .filter(row => row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
          .map(row => 
            headers.map((_, colIdx) => {
              const cell = row[colIdx];
              if (cell instanceof Date) {
                return cell.toISOString().split('T')[0];
              }
              return cell !== null && cell !== undefined ? String(cell).trim() : '';
            })
          );
      } else {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          showToast('Empty CSV file!', 'error');
          return;
        }
        headers = parsed[0].map(h => h.trim());
        rows = parsed.slice(1)
          .filter(row => row && row.some(cell => cell && cell.trim() !== ''))
          .map(row => 
            headers.map((_, colIdx) => {
              const cell = row[colIdx];
              return cell !== undefined && cell !== null ? cell.trim() : '';
            })
          );
      }

      setAllRawHeaders(headers);
      setAllRawRows(rows);
      setTotalFileRowsCount(rows.length);

      // Advance to Mapping
      applyLocalMapping(headers);
      setStep('mapping');
    } catch (err) {
      console.error(err);
      showToast('Error analyzing spreadsheet layers.', 'error');
    }
  };

  // Local mapping function based on header patterns
  const applyLocalMapping = (headers: string[]) => {
    const localMappings: Record<string, string> = {};
    headers.forEach(h => {
      const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = Object.entries(FIELD_MAPPINGS[importType]).find(([_, aliases]) => 
        aliases.some(alias => alias.toLowerCase().replace(/[^a-z0-9]/g, '') === norm)
      );
      localMappings[h] = match ? match[0] : '';
    });
    setMappings(localMappings);
    setSessionCustomFields([]);
  };

  // Start background processing
  const handleStartImport = async () => {
    try {
      // 1. First, create any custom fields that are actively mapped
      const selectedCustomFields = sessionCustomFields.filter(cf => 
        Object.values(mappings).includes(cf.key)
      );

      for (const field of selectedCustomFields) {
        const exists = customFieldDefinitions.some(d => d.key === field.key);
        if (!exists) {
          const newDef: CustomFieldDefinition = {
            id: 'cf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            entityType: 'candidate',
            name: field.name,
            key: field.key,
            type: field.type,
            options: field.options,
            isRequired: false
          };
          await handleAddCustomFieldDef(newDef);
        }
      }

      // 2. Build final column map (Target Platform Field Key -> CSV Header Index)
      const columnMapPayload: Record<string, number> = {};
      allRawHeaders.forEach((header, idx) => {
        const platformField = mappings[header];
        if (platformField && platformField !== 'null' && platformField !== '') {
          columnMapPayload[platformField] = idx;
        }
      });

      // 3. Dispatch background import task
      onStartBackgroundImport(
        fileName,
        importType,
        allRawHeaders,
        allRawRows,
        columnMapPayload,
        defaultValues,
        duplicateStrategy
      );
      setStep('importing');
    } catch (err) {
      showToast('Failed to initialize bulk importer.', 'error');
    }
  };

  const getPlatformFieldsList = () => {
    if (importType === 'candidates') {
      return [
        { key: 'name', label: 'Candidate Full Name' },
        { key: 'email', label: 'Email Address' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'experience', label: 'Years of Experience' },
        { key: 'skills', label: 'Technical Skills' },
        { key: 'currentCompany', label: 'Current Employer' },
        { key: 'designation', label: 'Job Designation / Title' },
        { key: 'education', label: 'Highest Education' },
        { key: 'expectedSalary', label: 'Expected Salary' },
        { key: 'gender', label: 'Gender' },
        { key: 'address', label: 'Full Address' },
        { key: 'city', label: 'City' },
        { key: 'notes', label: 'General remarks / Resume summary' },
        { key: 'appliedDate', label: 'Application Date' }
      ];
    } else if (importType === 'companies') {
      return [
        { key: 'name', label: 'Company Name' },
        { key: 'email', label: 'Company Email' },
        { key: 'phone', label: 'Company Phone' },
        { key: 'website', label: 'Website URL' },
        { key: 'address', label: 'Address' },
        { key: 'notes', label: 'Company Notes' },
        { key: 'recContact', label: 'Assigned Recruiter' },
        { key: 'industry', label: 'Industry' },
        { key: 'companySize', label: 'Company Size' },
        { key: 'foundedYear', label: 'Founded Year' },
        { key: 'tier', label: 'Partnership Tier' },
        { key: 'linkedInUrl', label: 'LinkedIn Page' }
      ];
    } else {
      return [
        { key: 'title', label: 'Job Title' },
        { key: 'companyName', label: 'Company Name' },
        { key: 'experience', label: 'Experience Level' },
        { key: 'location', label: 'Job Location' },
        { key: 'salary', label: 'Salary Range' },
        { key: 'status', label: 'Status' },
        { key: 'description', label: 'Job Description' },
        { key: 'requiredSkills', label: 'Required Skills' },
        { key: 'employmentType', label: 'Employment Type' },
        { key: 'department', label: 'Department' },
        { key: 'urgency', label: 'Urgency' },
        { key: 'recruiterName', label: 'Assigned Recruiter' }
      ];
    }
  };

  return (
    <AnimatedModal isOpen={isOpenLocal} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 max-w-4xl w-full overflow-hidden transition-all duration-200 transform max-h-[85vh] flex flex-col justify-between font-sans ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI-Powered Bulk Importer</h3>
              <p className="text-[10px] text-slate-500">Google Gemma semantic model detects structure and custom fields automatically.</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            disabled={step === 'importing'}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-200 rounded-xl text-xs">
                <div>
                  <p className="font-semibold text-slate-900">Import Entity Registry</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Select the workspace module to populate with spreadsheet data.</p>
                </div>
                <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setImportType('candidates')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${importType === 'candidates' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-550 hover:text-slate-900'}`}
                  >
                    👤 Candidates
                  </button>
                  <button 
                    onClick={() => setImportType('companies')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${importType === 'companies' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-550 hover:text-slate-900'}`}
                  >
                    🏢 Companies
                  </button>
                  <button 
                    onClick={() => setImportType('jobs')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all ${importType === 'jobs' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-550 hover:text-slate-900'}`}
                  >
                    💼 Jobs
                  </button>
                </div>
              </div>

              {/* Drag Area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-all ${dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInput} 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                />
                <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-center text-xs">
                  <p className="font-semibold text-slate-800">Drag and drop spreadsheet files here</p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports CSV, Excel (.xlsx, .xls) up to 20MB</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>Need an example? Download a template containing required header layouts.</span>
                </div>
                <button 
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 border border-slate-200 bg-white font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Layout
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI Auto-Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6 animate-fade-in text-xs">
              <div className="space-y-6">
                  {/* File Metadata */}
                  <div className="flex items-center justify-between bg-slate-550/5 border border-slate-200 p-3 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-800 truncate max-w-[250px]">{fileName}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{fileSizeStr} • {totalFileRowsCount} Rows detected</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-450">Duplicate Handle:</label>
                      <select 
                        value={duplicateStrategy}
                        onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none"
                      >
                        <option value="skip">Skip duplicates</option>
                        <option value="update">Overwrite / Update</option>
                        <option value="create">Allow clones (create all)</option>
                      </select>
                    </div>
                  </div>

                  {/* Core Column Mapping */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1">
                        <Columns className="h-4 w-4 text-blue-600" />
                        Core Schema Mapping
                      </h4>
                      
                      {/* Live Mapping Summary Bar */}
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/85 px-3.5 py-1.5 rounded-xl text-[10px] font-semibold text-slate-600 select-none">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>{allRawHeaders.filter(h => mappings[h] && !sessionCustomFields.some(cf => cf.key === mappings[h])).length} Mapped</span>
                        </div>
                        {importType === 'candidates' && (
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            <span>{allRawHeaders.filter(h => mappings[h] && sessionCustomFields.some(cf => cf.key === mappings[h])).length} Custom</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-450" />
                          <span>{allRawHeaders.filter(h => !mappings[h]).length} Skipped</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-450 border-b border-slate-150">
                            <th className="p-3">Spreadsheet Header</th>
                            <th className="p-3">Sample Value</th>
                            <th className="p-3">Platform Field</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {allRawHeaders.map((header, idx) => {
                            const sampleValue = allRawRows[0]?.[idx] || '';
                            const mappedKey = mappings[header] || '';
                            const isSkipped = !mappedKey || mappedKey === '';
                            
                            // Check for custom field definition
                            const customField = sessionCustomFields.find(cf => cf.key === mappedKey) ||
                                                customFieldDefinitions.find(cf => cf.key === mappedKey && cf.entityType === 'candidate');
                            const isCustomMapped = !!customField;

                            // Validation Warning
                            const warningMessage = getFieldWarning(mappedKey, sampleValue);

                            return (
                              <tr 
                                key={idx} 
                                className={`transition-all duration-150 border-b border-slate-100 ${
                                  isSkipped 
                                    ? 'opacity-55 bg-slate-50/20 text-slate-450' 
                                    : 'bg-white hover:bg-slate-50/30 text-slate-800'
                                }`}
                              >
                                <td className="p-3 font-semibold text-slate-850 font-mono">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{header}</span>
                                    {isCustomMapped && (
                                      <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded-full border border-purple-100 select-none">
                                        Custom: {customField.type}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 italic max-w-xs truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span>{sampleValue || '(Empty)'}</span>
                                    {warningMessage && (
                                      <span 
                                        className="inline-flex text-amber-500 hover:text-amber-600 transition-colors cursor-help shrink-0" 
                                        title={warningMessage}
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <select
                                    value={mappedKey}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'create_custom_manual') {
                                        setEditingCustomFieldHeader(header);
                                      } else {
                                        setMappings(prev => ({
                                          ...prev,
                                          [header]: val
                                        }));
                                      }
                                    }}
                                    className={`bg-white border text-xs rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium w-full max-w-[220px] transition-all cursor-pointer ${
                                      isSkipped 
                                        ? 'border-slate-200 text-slate-450' 
                                        : isCustomMapped 
                                          ? 'border-purple-300 text-purple-700 bg-purple-50/5 font-semibold' 
                                          : 'border-blue-200 text-blue-700 font-semibold'
                                    }`}
                                  >
                                    <option value="">Skip Column (Unmapped)</option>
                                    
                                    <optgroup label="Standard Fields">
                                      {getPlatformFieldsList().map((pf) => (
                                        <option key={pf.key} value={pf.key}>{pf.label}</option>
                                      ))}
                                    </optgroup>

                                    {importType === 'candidates' && customFieldDefinitions.filter(cf => cf.entityType === 'candidate').length > 0 && (
                                      <optgroup label="Settings Custom Fields">
                                        {customFieldDefinitions.filter(cf => cf.entityType === 'candidate').map((cf) => (
                                          <option key={cf.key} value={cf.key}>
                                            {`${cf.name} (${cf.type})`}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}

                                    {importType === 'candidates' && sessionCustomFields.length > 0 && (
                                      <optgroup label="Custom Fields (Create Inline)">
                                        {sessionCustomFields.map((cf) => (
                                          <option key={cf.key} value={cf.key}>
                                            {`+ ${cf.name} (${cf.type})`}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}

                                    {importType === 'candidates' && (
                                      <optgroup label="Actions">
                                        <option value="create_custom_manual">+ Create Custom Field Manually...</option>
                                      </optgroup>
                                    )}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              {/* Manual Inline Custom Field Configuration Modal */}
              {editingCustomFieldHeader && (
                <Portal>
                  <div className="fixed inset-0 z-[100] bg-slate-900/40 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-sm w-full space-y-4 animate-scale-up text-slate-800 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-900">
                        Configure Custom Field
                      </h4>
                      <button 
                        onClick={() => setEditingCustomFieldHeader(null)}
                        className="text-slate-400 hover:text-slate-650 cursor-pointer animate-fade-in"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      Configure custom field settings for column <strong>"{editingCustomFieldHeader}"</strong>.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Field Label</label>
                        <input 
                          type="text"
                          value={manualFieldName}
                          onChange={(e) => setManualFieldName(e.target.value)}
                          placeholder="e.g. Notice Period"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Field Type</label>
                        <select 
                          value={manualFieldType}
                          onChange={(e) => setManualFieldType(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="text">Short Text</option>
                          <option value="number">Number Input</option>
                          <option value="date">Date Selection</option>
                          <option value="boolean">Toggle / Checkbox</option>
                          <option value="dropdown">Dropdown Selection</option>
                        </select>
                      </div>

                      {manualFieldType === 'dropdown' && (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700">Dropdown Choices (comma-separated)</label>
                          <input 
                            type="text"
                            value={manualFieldOptions}
                            onChange={(e) => setManualFieldOptions(e.target.value)}
                            placeholder="Yes, No, Maybe"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setEditingCustomFieldHeader(null)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (!manualFieldName.trim()) {
                            showToast('Field Name is required', 'error');
                            return;
                          }
                          const key = manualFieldName.trim().toLowerCase().replace(/\s+/g, '_');
                          const newField: SuggestedCustomField = {
                            csvHeader: editingCustomFieldHeader,
                            name: manualFieldName.trim(),
                            key,
                            type: manualFieldType,
                            options: manualFieldType === 'dropdown' 
                              ? manualFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
                              : undefined,
                            confirmed: true
                          };
                          setSessionCustomFields(prev => {
                            const filtered = prev.filter(cf => cf.csvHeader !== editingCustomFieldHeader);
                            return [...filtered, newField];
                          });
                          setMappings(prev => ({
                            ...prev,
                            [editingCustomFieldHeader]: key
                          }));
                          setEditingCustomFieldHeader(null);
                          showToast(`✓ Custom field "${manualFieldName}" configured!`, 'success');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer font-semibold"
                      >
                        Confirm Field
                      </button>
                  </div>
                </div>
              </div>
            </Portal>
            )}

            </div>
          )}

          {/* STEP 3: Background Importing Progress */}
          {step === 'importing' && activeImportTask && (() => {
            const currentProcessed = (activeImportTask.importedCount ?? 0) + (activeImportTask.failedCount ?? 0) + (activeImportTask.skippedCount ?? 0);
            const progressPercent = (activeImportTask.totalRows ?? 0) > 0 
              ? Math.round((currentProcessed / activeImportTask.totalRows) * 100) 
              : 0;

            return (
              <div className="space-y-6 animate-fade-in text-xs py-4 max-w-md mx-auto">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-9 w-9 text-blue-600 animate-spin" />
                  <div className="text-center space-y-0.5">
                    <h3 className="font-bold text-slate-800 text-sm">Chunk processing in background...</h3>
                    <p className="text-[10px] text-slate-450 max-w-xs leading-normal">
                      Importing your records securely into Supabase. You can close this modal; the import task progress runs in the background.
                    </p>
                  </div>
                </div>

                {/* Progress HUD */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px] font-bold text-slate-500">
                    <span>Progress: {currentProcessed} / {activeImportTask.totalRows} rows</span>
                    <span className="text-blue-600">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Live Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center text-[10px]">
                  <div>
                    <span className="block font-bold text-slate-850 text-xs">{activeImportTask.speed} /s</span>
                    <span className="text-slate-400 uppercase tracking-wider font-semibold">Speed</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-850 text-xs">
                      {activeImportTask.estimatedTimeRemaining > 0 
                        ? `${activeImportTask.estimatedTimeRemaining}s` 
                        : 'Calcul...'
                      }
                    </span>
                    <span className="text-slate-400 uppercase tracking-wider font-semibold">Remaining</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-850 text-xs">
                      {activeImportTask.currentChunk} / {activeImportTask.totalChunks}
                    </span>
                    <span className="text-slate-400 uppercase tracking-wider font-semibold">Chunk</span>
                  </div>
                </div>

                {/* Grid Counters */}
                <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center font-semibold font-mono">
                  <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-lg p-2">
                    <span className="block text-xs font-bold">{activeImportTask.importedCount}</span>
                    <span className="text-[8px] text-emerald-500 uppercase tracking-wide">Success</span>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100 text-amber-800 rounded-lg p-2">
                    <span className="block text-xs font-bold">{activeImportTask.duplicateCount || 0}</span>
                    <span className="text-[8px] text-amber-500 uppercase tracking-wide">Dupe</span>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 text-rose-800 rounded-lg p-2">
                    <span className="block text-xs font-bold">{activeImportTask.failedCount}</span>
                    <span className="text-[8px] text-rose-500 uppercase tracking-wide">Failed</span>
                  </div>
                  <div className="bg-slate-100 border border-slate-200 text-slate-650 rounded-lg p-2">
                    <span className="block text-xs font-bold">{activeImportTask.skippedCount}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wide">Skipped</span>
                  </div>
                </div>

                {/* Real-time Validation Error Log HUD */}
                {Array.isArray(activeImportTask.errorLogs) && activeImportTask.errorLogs.length > 0 && (
                  <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/30">
                    <button 
                      onClick={() => setShowErrorLogs(!showErrorLogs)}
                      className="w-full flex items-center justify-between p-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer select-none border-b border-slate-150"
                    >
                      <span className="flex items-center gap-1.5 text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Live Validation Logs ({activeImportTask.errorLogs.length})
                      </span>
                      {showErrorLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showErrorLogs && (
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-150 p-1 font-mono text-[9px] bg-white text-left">
                        {activeImportTask.errorLogs.slice(-10).map((log: any, lIdx: number) => (
                          <div key={lIdx} className="p-1.5 space-y-0.5">
                            <div className="flex items-center justify-between text-rose-700">
                              <span>Row #{log?.row ?? ''}</span>
                              <span className="font-bold">{log?.reason ?? ''}</span>
                            </div>
                            {log?.value && <p className="text-slate-455 truncate">Value: "{log.value}"</p>}
                            <p className="text-slate-550 text-[8px] font-sans">Fix: {log?.fix ?? ''}</p>
                          </div>
                        ))}
                        {activeImportTask.errorLogs.length > 10 && (
                          <p className="p-1.5 text-center text-slate-405">...and {activeImportTask.errorLogs.length - 10} older logs</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* STEP 4: Summary / Completion Report */}
          {step === 'summary' && activeImportTask && (
            <div className="space-y-6 animate-fade-in text-xs">
              <div className="p-5 border border-slate-250 bg-slate-50/50 rounded-2xl flex items-start gap-4">
                {activeImportTask.status === 'completed' ? (
                  <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-250 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 border border-rose-250 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {activeImportTask.status === 'completed' ? 'Bulk Sourcing Task Finished' : 'Bulk Sourcing Task Stopped'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Import Sourcing Task Identifier: <span className="font-mono">{activeImportTask.id}</span>
                  </p>
                  
                  {/* Corrected & Enriched Summary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-[11px] font-sans border-t border-slate-200/60 mt-3">
                    <div>
                      <span className="font-mono text-[9px] text-slate-400 block uppercase">Total Rows</span>
                      <span className="font-semibold text-slate-800">{activeImportTask.totalRows}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-slate-400 block uppercase">Sourced</span>
                      <span className="font-semibold text-emerald-600">{activeImportTask.importedCount}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-slate-400 block uppercase">Clones/Dupes</span>
                      <span className="font-semibold text-amber-600">{activeImportTask.duplicateCount || 0}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-slate-400 block uppercase">Failed</span>
                      <span className="font-semibold text-rose-600">{activeImportTask.failedCount || 0}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-slate-400 block uppercase">Status</span>
                      <span className="font-semibold uppercase font-mono text-emerald-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {activeImportTask.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sourcing Validation Errors Logs */}
              {Array.isArray(activeImportTask.errorLogs) && activeImportTask.errorLogs.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/10">
                  <button 
                    onClick={() => setShowErrorLogs(!showErrorLogs)}
                    className="w-full flex items-center justify-between p-3 text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer select-none border-b border-slate-200"
                  >
                    <span className="flex items-center gap-1.5 text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5 animate-pulse" />
                      Sourcing Error Logs & Failures ({activeImportTask.errorLogs.length})
                    </span>
                    {showErrorLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showErrorLogs && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-150 p-1 font-mono text-[9px] bg-white">
                      {activeImportTask.errorLogs.map((log: any, lIdx: number) => (
                        <div key={lIdx} className="p-2 space-y-0.5 text-left">
                          <div className="flex items-center justify-between text-rose-700">
                            <span>Row #{log?.row ?? ''}</span>
                            <span className="font-bold">{log?.reason ?? ''}</span>
                          </div>
                          {log?.value && <p className="text-slate-450 truncate">Value: "{log.value}"</p>}
                          <p className="text-slate-550 text-[8px] font-sans">Fix recommendation: {log?.fix ?? ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {onRollbackImport && (
                <div className="p-4 border border-rose-100 bg-rose-50/20 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Made a mistake during mapping?</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Rollback imports to permanently delete all candidates created by this import id.</p>
                  </div>
                  <button 
                    onClick={() => {
                      onRollbackImport(activeImportTask.id);
                      setStep('upload');
                    }}
                    className="px-3.5 py-1.5 text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Rollback Sourcing
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            {step === 'mapping' && (
              <button 
                onClick={() => setStep('upload')} 
                className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Upload
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClose}
              disabled={step === 'importing'}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-655 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Close
            </button>
            
            {step === 'upload' && allRawRows.length > 0 && (
              <button 
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Review Map
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 'mapping' && (
              <button 
                onClick={handleStartImport}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Start Importing
              </button>
            )}
          </div>
        </div>

        </div>
      )}
    </AnimatedModal>
  );
}
