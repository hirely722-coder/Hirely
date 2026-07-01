import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Building2, Briefcase, Users, GitMerge, CheckSquare, 
  Mail, Sparkles, Settings, User, Bell, Search, LogOut, ChevronRight, Check, AlertCircle, X,
  Palette, Menu
} from 'lucide-react';

import DashboardView from './components/DashboardView';
import CompaniesView from './components/CompaniesView';
import JobsView from './components/JobsView';
import CandidatesView from './components/CandidatesView';
import PipelineView from './components/PipelineView';
import TasksView from './components/TasksView';
import TemplatesView from './components/TemplatesView';
import CopilotView from './components/CopilotView';
import SettingsView from './components/SettingsView';
import ProfileView from './components/ProfileView';
import { EmailComposeModal, WhatsAppComposeModal, InterviewSchedulerModal, AddTaskModal } from './components/GlobalModals';
import { injectThemeCSS, THEME_PRESETS } from './components/ThemeBuilderView';
import CSVImportModal from './components/CSVImportModal';
import BackgroundImportWidget from './components/BackgroundImportWidget';
import { 
  ImportTask, cleanEmail, cleanPhone, cleanName, cleanSkills, cleanExperience, cleanSalary, validateRecord,
  addImportHistoryItem, updateImportHistoryItem, getImportHistory, ImportHistoryItem
} from './utils/importEngine';
import * as XLSX from 'xlsx';

import { Company, Job, Candidate, Task, EmailTemplate, ActivityLog, TeamMember, CommunicationLog, EmailConfig } from './types';
import { 
  initialCompanies, 
  initialJobs, 
  initialCandidates, 
  initialTasks, 
  initialTemplates, 
  initialActivityLogs,
  initialTeamMembers,
  initialCommunicationLogs
} from './mockData';

type ViewName = 'Dashboard' | 'Companies' | 'Jobs' | 'Candidates' | 'Pipeline' | 'Tasks' | 'Templates' | 'Copilot' | 'Settings' | 'Profile';

export default function App() {
  // Global States
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('apex-theme') || 'slate');
  
  // Load and apply custom themes dynamically on load or theme change
  useEffect(() => {
    const savedActive = localStorage.getItem('apex-custom-theme-active-data');
    if (savedActive) {
      try {
        const themeData = JSON.parse(savedActive);
        if (themeData && themeData.id === theme) {
          injectThemeCSS(themeData);
          return;
        }
      } catch (e) {}
    }

    // Otherwise, check if it's a built-in preset
    const matchingPreset = THEME_PRESETS.find(p => p.id === theme);
    if (matchingPreset) {
      injectThemeCSS(matchingPreset);
    }
  }, [theme]);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>(initialCommunicationLogs);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'Gmail',
    smtpHost: 'smtp.gmail.com',
    port: '587',
    username: 'sarah.j@apexstaffing.com',
    password: '••••••••••••',
    encryption: 'TLS',
    isConnected: true
  });

  // CSV Import State
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [csvImportInitialType, setCsvImportInitialType] = useState<'companies' | 'jobs' | 'candidates'>('candidates');

  const handleOpenCSVImport = (type: 'companies' | 'jobs' | 'candidates') => {
    setCsvImportInitialType(type);
    setIsCSVImportOpen(true);
  };

  // State Refs for High-Performance Async Imports without Stale Closures
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;
  const companiesRef = useRef(companies);
  companiesRef.current = companies;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  // Background Import State
  const [activeImportTask, setActiveImportTask] = useState<ImportTask | null>(null);
  const activeImportTaskRef = useRef<ImportTask | null>(null);

  const startBackgroundImport = (
    fileName: string,
    importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates',
    rawHeaders: string[],
    rawRows: string[][],
    columnMap: Record<string, number>,
    defaultValues: Record<string, string>,
    duplicateStrategy: 'skip' | 'update' | 'create'
  ) => {
    const chunkSize = 250; // Performance chunk size
    const totalRows = (rawRows && Array.isArray(rawRows)) ? rawRows.length : 0;
    const totalChunks = Math.ceil(totalRows / chunkSize);

    const task: ImportTask = {
      id: 'import_' + Date.now(),
      fileName,
      importType,
      status: 'processing',
      totalRows,
      importedCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      currentChunk: 0,
      totalChunks,
      speed: 0,
      startTime: Date.now(),
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      errorLogs: [],
      duplicateStrategy,
      defaultValues,
      mapping: columnMap || {},
      rawHeaders: rawHeaders || [],
      rawRows: rawRows || []
    };

    setActiveImportTask(task);
    activeImportTaskRef.current = task;
    
    // Add to history list immediately
    const historyItem: ImportHistoryItem = {
      id: task.id,
      fileName: task.fileName,
      importType: task.importType,
      status: 'processing',
      totalRows: task.totalRows,
      importedCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      duration: 0,
      speed: 0
    };
    addImportHistoryItem(historyItem);

    showToast(`🚀 Started background import for ${totalRows} records!`, 'success');

    // Close CSV Modal immediately as requested to allow using other views
    setIsCSVImportOpen(false);

    // Launch async chunk processor
    processNextChunk(task.id, 0, chunkSize);
  };

  const estimateMemoryUsage = (task: ImportTask) => {
    if (typeof window !== 'undefined' && window.performance && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      return `${usedMB} MB (Actual JS Heap)`;
    }
    const rowCount = (task.rawRows && Array.isArray(task.rawRows)) ? task.rawRows.length : 0;
    const colCount = (task.rawHeaders && Array.isArray(task.rawHeaders)) ? task.rawHeaders.length : 0;
    const bytes = rowCount * colCount * 50; // estimate 50 bytes per cell on average
    const mb = (bytes / 1024 / 1024).toFixed(2);
    return `${mb} MB (Estimated dataset footprint)`;
  };

  const processNextChunk = (taskId: string, chunkIndex: number, chunkSize: number) => {
    setTimeout(() => {
      const task = activeImportTaskRef.current;
      if (!task || task.id !== taskId) return;
      if (task.status === 'paused') {
        console.log(`[PIPELINE: CHUNK] Import task ${taskId} is currently paused.`);
        return; // Halt chunk loop, resume later
      }
      if (task.status === 'failed' || task.status === 'completed') {
        console.log(`[PIPELINE: CHUNK] Import task ${taskId} is already in state ${task.status}.`);
        return;
      }

      console.log(`=== PIPELINE: CHUNK [Batch ${chunkIndex + 1} of ${task.totalChunks}] ===`);

      const startIdx = chunkIndex * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, task.totalRows);
      
      if (!task.rawRows || !Array.isArray(task.rawRows)) {
        console.error("[PIPELINE: CHUNK] ERROR: rawRows is undefined or not an array inside processNextChunk");
        return;
      }
      
      const chunkRows = task.rawRows.slice(startIdx, endIdx);
      if (!Array.isArray(chunkRows)) {
        console.error("[PIPELINE: CHUNK] ERROR: sliced chunkRows is not an array");
        return;
      }

      // Collect existing email and phone lists dynamically
      const existingEmails = new Set<string>();
      const existingPhones = new Set<string>();
      if (Array.isArray(candidatesRef.current)) {
        candidatesRef.current.forEach(c => {
          if (c) {
            if (typeof c.email === 'string') existingEmails.add(cleanEmail(c.email));
            if (typeof c.phone === 'string') existingPhones.add(cleanPhone(c.phone));
          }
        });
      }

      let imported = 0;
      let failed = 0;
      let duplicate = 0;
      let skipped = 0;
      const chunkErrorLogs: any[] = [];

      const newCandidatesToBatch: Candidate[] = [];
      const newCompaniesToBatch: Company[] = [];
      const newJobsToBatch: Job[] = [];

      const fieldsToMap = task.mapping && typeof task.mapping === 'object' ? Object.keys(task.mapping) : [];

      console.log(`[PIPELINE: PARSE] Loaded ${chunkRows.length} raw rows from memory buffer.`);

      // Process rows inside a try-catch for isolation!
      chunkRows.forEach((row, index) => {
        const rowNum = startIdx + index + 1;
        try {
          if (!row || !Array.isArray(row)) {
            throw new Error(`Row data is undefined or not an array.`);
          }

          // Stage 2: NORMALIZE
          const record: Record<string, any> = {};
          if (Array.isArray(fieldsToMap)) {
            fieldsToMap.forEach(field => {
              const colIdx = task.mapping ? task.mapping[field] : -1;
              record[field] = (colIdx !== undefined && colIdx !== -1 && colIdx < row.length) ? (row[colIdx] ?? '') : '';
            });
          }

          // Cleanse input values with safe type guards
          if (task.importType === 'candidates') {
            record.name = cleanName(typeof record.name === 'string' ? record.name : '');
            record.email = cleanEmail(typeof record.email === 'string' ? record.email : '');
            record.phone = cleanPhone(typeof record.phone === 'string' ? record.phone : '');
            record.skills = cleanSkills(typeof record.skills === 'string' ? record.skills : '');
            record.experience = cleanExperience(typeof record.experience === 'string' ? record.experience : '');
            record.currentCompany = typeof record.currentCompany === 'string' ? record.currentCompany.trim() : '';
            record.education = typeof record.education === 'string' ? record.education.trim() : '';
            record.notes = typeof record.notes === 'string' ? record.notes.trim() : '';
            record.designation = typeof record.designation === 'string' ? record.designation.trim() : '';
            record.gender = typeof record.gender === 'string' ? record.gender.trim() : '';
            record.city = typeof record.city === 'string' ? record.city.trim() : '';
            record.expectedSalary = cleanSalary(typeof record.expectedSalary === 'string' ? record.expectedSalary : '');
          } else if (task.importType === 'companies') {
            record.name = cleanName(typeof record.name === 'string' ? record.name : '');
            record.email = cleanEmail(typeof record.email === 'string' ? record.email : '');
            record.phone = cleanPhone(typeof record.phone === 'string' ? record.phone : '');
            record.website = typeof record.website === 'string' ? record.website.trim() : '';
            record.address = typeof record.address === 'string' ? record.address.trim() : '';
            record.notes = typeof record.notes === 'string' ? record.notes.trim() : '';
            record.industry = typeof record.industry === 'string' ? record.industry.trim() : '';
          } else if (task.importType === 'jobs') {
            record.title = typeof record.title === 'string' ? record.title.trim() : '';
            record.companyName = typeof record.companyName === 'string' ? record.companyName.trim() : '';
            record.experience = cleanExperience(typeof record.experience === 'string' ? record.experience : '');
            record.location = typeof record.location === 'string' ? record.location.trim() : '';
            record.salary = cleanSalary(typeof record.salary === 'string' ? record.salary : '');
            record.requiredSkills = cleanSkills(typeof record.requiredSkills === 'string' ? record.requiredSkills : '').join(', ');
            record.department = typeof record.department === 'string' ? record.department.trim() : '';
          }

          // Apply automatic default fallback values safely
          if (task.defaultValues && typeof task.defaultValues === 'object') {
            Object.entries(task.defaultValues).forEach(([defKey, defVal]) => {
              if (defVal && (!record[defKey] || record[defKey] === '')) {
                record[defKey] = defVal;
              }
            });
          }

          // Stage 3: VALIDATE
          const { errors, warnings } = validateRecord(
            record,
            task.importType,
            rowNum,
            existingEmails,
            existingPhones
          );

          if (Array.isArray(errors) && errors.length > 0) {
            failed++;
            chunkErrorLogs.push(...errors);
            console.warn(`[PIPELINE: VALIDATE] Validation failed on row ${rowNum}: ${errors[0]?.reason}`);
            return; // Skip malformed row
          }

          // Keep batch duplicate prevention (if multiple identical rows in same chunk)
          const isCand = task.importType === 'candidates';
          if (isCand) {
            const normEmail = cleanEmail(record.email);
            const normPhone = cleanPhone(record.phone);
            const isDupe = existingEmails.has(normEmail) || (normPhone && existingPhones.has(normPhone));

            if (isDupe) {
              duplicate++;
              if (task.duplicateStrategy === 'skip') {
                skipped++;
                chunkErrorLogs.push({
                  row: rowNum,
                  field: 'email/phone',
                  value: record.email || record.phone || '',
                  reason: 'Duplicate candidate skipped',
                  fix: 'The candidate is already registered. Row skipped.'
                });
                return;
              } else if (task.duplicateStrategy === 'update') {
                record._isUpdate = true;
                record._dupeEmail = normEmail;
                record._dupePhone = normPhone;
              }
            }
          }

          // Stage 5: IMPORT (Map records to actual entities)
          if (task.importType === 'candidates') {
            const candidateId = record._isUpdate
              ? ''
              : 'cand_bg_' + Date.now() + '_' + rowNum + '_' + Math.random().toString(36).substr(2, 4);

            const newCand: Candidate = {
              id: candidateId,
              name: record.name,
              phone: record.phone || 'N/A',
              email: record.email,
              experience: record.experience || '3 Years',
              skills: Array.isArray(record.skills) ? record.skills : cleanSkills(record.skills),
              currentCompany: record.currentCompany || 'Freelancer',
              status: (['Applied', 'Screening', 'Shortlisted', 'Interview', 'Selected', 'Offer Sent', 'Joined'].includes(record.status) ? record.status : 'Applied') as Candidate['status'],
              aiMatchScore: 0,
              resumeText: record.resumeText || `Imported profile notes: ${record.notes || ''}`,
              education: record.education || 'High School / Self-taught',
              address: record.address || 'N/A',
              notes: record.notes || 'No added interview logs.',
              appliedDate: new Date().toISOString().split('T')[0],
              designation: record.designation || undefined,
              gender: (['Male', 'Female', 'Other'].includes(record.gender) ? record.gender : 'Male') as Candidate['gender'],
              city: record.city || undefined,
              expectedSalary: record.expectedSalary || undefined,
              importId: task.id,
              _isUpdate: record._isUpdate,
              _dupeEmail: record._dupeEmail,
              _dupePhone: record._dupePhone
            } as any;

            newCandidatesToBatch.push(newCand);
            imported++;
          } else if (task.importType === 'companies') {
            const compId = 'c_bg_' + Date.now() + '_' + rowNum + '_' + Math.random().toString(36).substr(2, 4);
            const newComp: Company = {
              id: compId,
              name: record.name,
              contactPerson: record.contactPerson || 'HR Manager',
              openJobs: 0,
              status: (record.status === 'Inactive' || record.status === 'inactive') ? 'Inactive' : 'Active',
              email: record.email || 'partner@company.com',
              phone: record.phone || 'N/A',
              website: record.website || 'https://example.com',
              address: record.address || 'N/A',
              notes: record.notes || 'Onboarded partner client.',
              recContact: record.recruiterName || task.defaultValues.recruiterName || 'Sarah Jenkins',
              industry: record.industry || undefined,
              companySize: record.companySize || undefined,
              foundedYear: record.foundedYear || undefined,
              tier: record.tier || undefined,
              linkedInUrl: record.linkedInUrl || undefined,
              importId: task.id
            };
            newCompaniesToBatch.push(newComp);
            imported++;
          } else if (task.importType === 'jobs') {
            const jobId = 'j_bg_' + Date.now() + '_' + rowNum + '_' + Math.random().toString(36).substr(2, 4);
            const newJob: Job = {
              id: jobId,
              title: record.title,
              companyId: 'unknown',
              companyName: record.companyName,
              experience: record.experience || '3+ Years',
              location: record.location || 'Remote / Hybrid',
              applicationsCount: 0,
              status: (record.status === 'Closed' || record.status === 'closed') ? 'Closed' : 'Open',
              description: record.description || `Job openings for ${record.title} position.`,
              requiredSkills: record.requiredSkills ? record.requiredSkills.split(',').map((s: any) => s.trim()).filter(Boolean) : [],
              salary: record.salary || '$90,000 - $120,000',
              employmentType: record.employmentType || 'Full-time',
              department: record.department || 'Engineering',
              urgency: record.urgency || 'Medium',
              recruiterName: record.recruiterName || task.defaultValues.recruiterName || 'Sarah Jenkins',
              importId: task.id
            };
            newJobsToBatch.push(newJob);
            imported++;
          }
        } catch (rowError: any) {
          failed++;
          console.error(`[PIPELINE: IMPORT] ERROR on Row ${rowNum}:`, rowError);
          chunkErrorLogs.push({
            row: rowNum,
            field: 'row',
            value: '',
            reason: `Unexpected row parsing failure: ${rowError?.message || rowError}`,
            fix: 'Check row columns structure alignment and value types.'
          });
        }
      });

      // Isolate Chunk level batch commitment to prevent state corruption or crashing the thread
      try {
        // SINGLE OPTIMIZED BATCH STATE UPDATE
        if (Array.isArray(newCandidatesToBatch) && newCandidatesToBatch.length > 0) {
          setCandidates(prev => {
            const updatedList = Array.isArray(prev) ? [...prev] : [];
            newCandidatesToBatch.forEach(cand => {
              if (cand && (cand as any)._isUpdate) {
                const idx = updatedList.findIndex(
                  c => c && (cleanEmail(c.email) === (cand as any)._dupeEmail || cleanPhone(c.phone) === (cand as any)._dupePhone)
                );
                if (idx !== -1) {
                  updatedList[idx] = {
                    ...updatedList[idx],
                    ...cand,
                    id: updatedList[idx].id, // Keep original
                    _isUpdate: undefined,
                    _dupeEmail: undefined,
                    _dupePhone: undefined
                  } as any;
                } else {
                  updatedList.push(cand);
                }
              } else if (cand) {
                updatedList.push(cand);
              }
            });
            return updatedList;
          });
        }

        if (Array.isArray(newCompaniesToBatch) && newCompaniesToBatch.length > 0) {
          setCompanies(prev => [...newCompaniesToBatch, ...(Array.isArray(prev) ? prev : [])]);
        }

        if (Array.isArray(newJobsToBatch) && newJobsToBatch.length > 0) {
          setJobs(prev => {
            const updatedJobs = [...newJobsToBatch, ...(Array.isArray(prev) ? prev : [])];
            newJobsToBatch.forEach(job => {
              if (!job) return;
              setCompanies(cPrev => {
                const list = Array.isArray(cPrev) ? cPrev : [];
                const matched = list.find(c => c && c.name && job.companyName && c.name.toLowerCase() === job.companyName.toLowerCase());
                if (!matched) {
                  const newC: Company = {
                    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    name: job.companyName,
                    contactPerson: 'HR Partner',
                    openJobs: 1,
                    status: 'Active',
                    email: 'hr@' + job.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
                    phone: 'N/A',
                    website: 'https://' + job.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
                    address: 'N/A',
                    notes: 'Auto-created during background job import.',
                    recContact: job.recruiterName || 'Sarah Jenkins',
                    importId: job.importId
                  };
                  return [newC, ...list];
                } else {
                  return list.map(c => c.id === matched.id ? { ...c, openJobs: (c.openJobs || 0) + 1 } : c);
                }
              });
            });
            return updatedJobs;
          });
        }
        
        console.log(`[PIPELINE: IMPORT] Successfully committed chunk batch to application state.`);
      } catch (commitError: any) {
        console.error(`[PIPELINE: IMPORT] CRITICAL state commitment error on Chunk ${chunkIndex + 1}:`, commitError);
        failed += chunkRows.length; // Assume failure for chunk elements in reporting
        chunkErrorLogs.push({
          row: startIdx + 1,
          field: 'chunk_commit',
          value: `Chunk ${chunkIndex + 1}`,
          reason: `Commit Failure: ${commitError?.message || commitError}`,
          fix: 'The chunk failed to write to state. Internal system state error.'
        });
      }

      // METRICS CALCULATIONS
      const nextChunkIdx = chunkIndex + 1;
      const elapsedMs = Date.now() - task.startTime;
      const totalProcessedSoFar = task.importedCount + task.failedCount + task.skippedCount + imported + failed + skipped;
      
      const calcSpeed = elapsedMs > 0 ? Math.round((totalProcessedSoFar / (elapsedMs / 1000))) : 120;
      const speed = calcSpeed > 0 ? calcSpeed : 150;

      const remainingRows = task.totalRows - totalProcessedSoFar;
      const estimatedTimeRemaining = speed > 0 ? Math.ceil(remainingRows / speed) : 0;

      const isCompleted = nextChunkIdx >= task.totalChunks;

      const updatedTask: ImportTask = {
        ...task,
        status: isCompleted ? 'completed' : 'processing',
        currentChunk: nextChunkIdx,
        importedCount: task.importedCount + imported,
        failedCount: task.failedCount + failed,
        duplicateCount: task.duplicateCount + duplicate,
        skippedCount: task.skippedCount + skipped,
        speed,
        elapsedTime: elapsedMs,
        estimatedTimeRemaining: isCompleted ? 0 : estimatedTimeRemaining,
        errorLogs: Array.isArray(task.errorLogs) ? [...task.errorLogs, ...chunkErrorLogs] : chunkErrorLogs
      };

      setActiveImportTask(updatedTask);
      activeImportTaskRef.current = updatedTask;

      // Update the persistent Import History
      updateImportHistoryItem(updatedTask.id, {
        status: isCompleted ? 'completed' : updatedTask.status,
        importedCount: updatedTask.importedCount,
        failedCount: updatedTask.failedCount,
        duplicateCount: updatedTask.duplicateCount,
        skippedCount: updatedTask.skippedCount,
        duration: Math.round(elapsedMs / 1000),
        speed: speed
      });

      console.log(`[PIPELINE: CHUNK STATUS] Processed: ${totalProcessedSoFar}/${task.totalRows}. Throughput: ${speed} rec/sec. Elapsed: ${(elapsedMs/1000).toFixed(1)}s.`);

      if (isCompleted) {
        console.log(`=== PIPELINE: REPORT [Final Import Summary] ===`);
        console.log(`Processing time: ${(elapsedMs/1000).toFixed(2)} seconds`);
        console.log(`Throughput: ${speed} records/second`);
        console.log(`Success Count: ${updatedTask.importedCount}`);
        console.log(`Skipped Count: ${updatedTask.skippedCount}`);
        console.log(`Failed Count: ${updatedTask.failedCount}`);
        console.log(`Duplicate Count: ${updatedTask.duplicateCount}`);
        console.log(`Estimated Memory Usage: ${estimateMemoryUsage(updatedTask)}`);

        addActivityLog(
          task.importType === 'candidates' ? 'Candidate' : task.importType === 'companies' ? 'Company' : 'Job',
          `Successfully processed bulk background import of ${updatedTask.importedCount} records from "${task.fileName}".`
        );
        showToast(`✓ Background Import Complete! ${updatedTask.importedCount} records saved.`, 'success');
      } else {
        processNextChunk(taskId, nextChunkIdx, chunkSize);
      }
    }, 15);
  };

  const handlePauseImport = () => {
    if (activeImportTask) {
      const updated = { ...activeImportTask, status: 'paused' as const };
      setActiveImportTask(updated);
      activeImportTaskRef.current = updated;
      showToast('⏸ Background import paused.', 'success');
    }
  };

  const handleResumeImport = () => {
    if (activeImportTask) {
      const updated = { ...activeImportTask, status: 'processing' as const };
      setActiveImportTask(updated);
      activeImportTaskRef.current = updated;
      showToast('▶ Resuming background import.', 'success');
      processNextChunk(updated.id, updated.currentChunk, 250);
    }
  };

  const handleCancelImport = () => {
    if (activeImportTask) {
      const updated = { ...activeImportTask, status: 'failed' as const };
      setActiveImportTask(updated);
      activeImportTaskRef.current = updated;
      
      // Update in history too
      updateImportHistoryItem(updated.id, { status: 'cancelled' });

      showToast('🛑 Background import stopped.', 'error');
    }
  };

  const handleRollbackImport = (importId: string) => {
    if (!importId) return;

    let totalDeleted = 0;

    setCandidates(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const before = arr.length;
      const after = arr.filter(c => c.importId !== importId);
      totalDeleted += (before - after.length);
      return after;
    });

    setCompanies(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const before = arr.length;
      const after = arr.filter(c => c.importId !== importId);
      totalDeleted += (before - after.length);
      return after;
    });

    setJobs(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const before = arr.length;
      const after = arr.filter(j => j.importId !== importId);
      totalDeleted += (before - after.length);
      return after;
    });

    setTasks(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const before = arr.length;
      const after = arr.filter(t => t.importId !== importId);
      totalDeleted += (before - after.length);
      return after;
    });

    setTemplates(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const before = arr.length;
      const after = arr.filter(t => t.importId !== importId);
      totalDeleted += (before - after.length);
      return after;
    });

    updateImportHistoryItem(importId, { status: 'rolled_back' });

    addActivityLog(
      'System',
      `Rolled back bulk import (ID: ${importId}). Safely deleted all ${totalDeleted} created records.`
    );

    showToast(`✓ Rolled back import! Safely deleted ${totalDeleted} imported records.`, 'success');
  };

  const handleDownloadImportReport = () => {
    if (!activeImportTask) return;
    const task = activeImportTask;
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
      ['Import Status Report (Audit Pipeline stage: REPORT)', ''],
      ['File Name', task.fileName || 'N/A'],
      ['Import Type', task.importType || 'N/A'],
      ['Status', task.status || 'N/A'],
      ['Total Spreadsheet Rows', task.totalRows ?? 0],
      ['Successfully Imported/Updated (Success Count)', task.importedCount ?? 0],
      ['Failed Due to Validation Errors (Failed Count)', task.failedCount ?? 0],
      ['Duplicates Found (Duplicate Count)', task.duplicateCount ?? 0],
      ['Skipped Rows (Skipped Count)', task.skippedCount ?? 0],
      ['Processing Duration', `${(task.elapsedTime / 1000).toFixed(2)} seconds`],
      ['Average Throughput (Throughput)', `${task.speed ?? 120} records / sec`],
      ['Estimated Memory Usage', estimateMemoryUsage(task)]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Report');

    if (task.errorLogs && Array.isArray(task.errorLogs) && task.errorLogs.length > 0) {
      const errorHeader = ['Row Number', 'Field Name', 'Value Parsed', 'Validation Failure Reason', 'Suggested Rectification Fix'];
      const errorRows = task.errorLogs.map(log => [
        log.row ?? 'N/A',
        log.field ?? 'N/A',
        log.value ?? 'N/A',
        log.reason ?? 'N/A',
        log.fix ?? 'N/A'
      ]);
      const wsErrors = XLSX.utils.aoa_to_sheet([errorHeader, ...errorRows]);
      XLSX.utils.book_append_sheet(wb, wsErrors, 'Validation Errors Log');
    }

    const fileBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${task.importType}_import_sanitization_report.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported high-fidelity Excel validation report!', 'success');
  };

  const handleViewImportedResults = () => {
    if (activeImportTask) {
      if (activeImportTask.importType === 'candidates') {
        setActiveView('Candidates');
      } else if (activeImportTask.importType === 'companies') {
        setActiveView('Companies');
      } else if (activeImportTask.importType === 'jobs') {
        setActiveView('Jobs');
      }
      showToast(`Showing newly imported ${activeImportTask.importType} records!`, 'success');
    }
  };

  // Navigation State
  const [activeView, setActiveView] = useState<ViewName>('Dashboard');
  
  // Custom action overrides (e.g. telling Candidates view to open the Upload Resume modal on load)
  const [openCandidatesResumeOnLoad, setOpenCandidatesResumeOnLoad] = useState(false);

  // Global Compose Modals State
  const [emailComposeCandidate, setEmailComposeCandidate] = useState<Candidate | null>(null);
  const [emailComposePreselectedJob, setEmailComposePreselectedJob] = useState<Job | null>(null);
  const [whatsappComposeCandidate, setWhatsappComposeCandidate] = useState<Candidate | null>(null);
  const [whatsappComposePreselectedJob, setWhatsappComposePreselectedJob] = useState<Job | null>(null);
  const [scheduleInterviewCandidate, setScheduleInterviewCandidate] = useState<Candidate | null>(null);
  const [addTaskCandidate, setAddTaskCandidate] = useState<Candidate | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto task generator
  const triggerAutoTask = (candidate: Candidate, triggerType: 'email_sent' | 'whatsapp_sent' | 'interview_scheduled' | 'candidate_selected' | 'followup_added') => {
    let taskTitle = '';
    let taskType: Task['type'] = 'Follow Up';
    let priority: Task['priority'] = 'Medium';
    let daysFromNow = 1;

    if (triggerType === 'email_sent') {
      taskTitle = `Follow up with ${candidate.name} regarding sent email`;
      taskType = 'Email';
      priority = 'Medium';
      daysFromNow = 3;
    } else if (triggerType === 'whatsapp_sent') {
      taskTitle = `Check WhatsApp response from ${candidate.name}`;
      taskType = 'Follow Up';
      priority = 'Low';
      daysFromNow = 1;
    } else if (triggerType === 'interview_scheduled') {
      taskTitle = `Collect interview feedback for ${candidate.name}`;
      taskType = 'Interview';
      priority = 'High';
      daysFromNow = 1;
    } else if (triggerType === 'candidate_selected') {
      taskTitle = `Draft contract and offer sheet for ${candidate.name}`;
      taskType = 'Document';
      priority = 'High';
      daysFromNow = 3;
    } else if (triggerType === 'followup_added') {
      taskTitle = `Review screening or follow up notes: ${candidate.name}`;
      taskType = 'Call';
      priority = 'Medium';
      daysFromNow = 3;
    }

    const dueDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newTask: Task = {
      id: 't_' + Date.now() + Math.random().toString(36).substr(2, 5),
      type: taskType,
      title: taskTitle,
      candidateId: candidate.id,
      candidateName: candidate.name,
      priority,
      status: 'Pending',
      dueDate
    };

    setTasks(prev => [newTask, ...prev]);

    // Create log
    addActivityLog('Candidate', `Auto-created task: "${taskTitle}" due on ${dueDate}.`);

    // Add Notification
    setNotifications(prev => [
      { id: 'n_' + Date.now(), text: `Task created: ${taskTitle}.`, time: 'Just now', read: false },
      ...prev
    ]);
  };

  // Global Notification & Alert state
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string; read: boolean }[]>([
    { id: '1', text: 'Sarah Connor scheduled for AWS Interview today.', time: '10m ago', read: false },
    { id: '2', text: 'Emily Watson returned a high match score of 95%.', time: '1h ago', read: false },
    { id: '3', text: 'Linear partner requested new Frontend Designer profiles.', time: '4h ago', read: true }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Global search query
  const [globalSearch, setGlobalSearch] = useState('');

  // Mobile navigation drawer toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Navigation Menu Array
  const NAVIGATION_ITEMS: { name: ViewName; icon: React.ComponentType<any>; badge?: number }[] = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Companies', icon: Building2 },
    { name: 'Jobs', icon: Briefcase },
    { name: 'Candidates', icon: Users },
    { name: 'Pipeline', icon: GitMerge },
    { name: 'Tasks', icon: CheckSquare, badge: tasks.filter(t => t.status === 'Pending').length },
    { name: 'Templates', icon: Mail },
    { name: 'Copilot', icon: Sparkles },
    { name: 'Settings', icon: Settings },
    { name: 'Profile', icon: User }
  ];

  // Global search filter handler
  const handleGlobalSearchSelect = (candName: string) => {
    setGlobalSearch('');
    setActiveView('Candidates');
  };

  // State mutation callbacks passed to children views
  
  // Companies
  const handleAddCompany = (newCompany: Company) => {
    setCompanies(prev => [newCompany, ...prev]);
    addActivityLog('Company', `Added ${newCompany.name} as an active client partner.`);
  };

  const handleEditCompany = (updatedCompany: Company) => {
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    addActivityLog('Company', `Updated profile credentials for ${updatedCompany.name}.`);
  };

  const handleDeleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    addActivityLog('Company', `Removed company ID ${id} from corporate registry.`);
  };

  // Jobs
  const handleAddJob = (newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
    // update company openJobs count
    setCompanies(prev => prev.map(c => c.id === newJob.companyId ? { ...c, openJobs: c.openJobs + 1 } : c));
    addActivityLog('Job', `Created job posting: ${newJob.title} at ${newJob.companyName}.`);
  };

  const handleEditJob = (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    addActivityLog('Job', `Edited requirements details for ${updatedJob.title}.`);
  };

  const handleDeleteJob = (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (job) {
      setCompanies(prev => prev.map(c => c.id === job.companyId ? { ...c, openJobs: Math.max(0, c.openJobs - 1) } : c));
    }
    setJobs(prev => prev.filter(j => j.id !== id));
    addActivityLog('Job', `Deleted job posting ID ${id}.`);
  };

  // Candidates
  const handleAddCandidate = (newCandidate: Candidate) => {
    setCandidates(prev => [newCandidate, ...prev]);
    addActivityLog('Candidate', `Registered candidate profile: ${newCandidate.name}.`);
    
    // Auto-create task if specified
    const newTask: Task = {
      id: 't_' + Date.now(),
      type: 'Call',
      title: `Schedule screening call with ${newCandidate.name}`,
      candidateId: newCandidate.id,
      candidateName: newCandidate.name,
      priority: 'Medium',
      status: 'Pending',
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0] // +2 days
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleEditCandidate = (updatedCandidate: Candidate) => {
    setCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));
    addActivityLog('Candidate', `Updated interview logs & skills for ${updatedCandidate.name}.`);
  };

  const handleDeleteCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    addActivityLog('Candidate', `Removed candidate ID ${id} from ATS database.`);
  };

  // Pipeline status movement
  const handleUpdateCandidateStage = (candidateId: string, newStage: Candidate['status']) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStage } : c));
    const cand = candidates.find(c => c.id === candidateId);
    if (cand) {
      addActivityLog('Candidate', `Moved ${cand.name} to the '${newStage}' stage.`);
      showToast(`✓ Advanced ${cand.name} to ${newStage} stage!`, 'success');

      // Task auto-triggers based on stage movement
      if (newStage === 'Interview') {
        const newTask: Task = {
          id: 't_' + Date.now() + '_interview',
          type: 'Interview',
          title: `Prepare interview agenda for ${cand.name}`,
          candidateId: cand.id,
          candidateName: cand.name,
          priority: 'High',
          status: 'Pending',
          dueDate: new Date().toISOString().split('T')[0]
        };
        setTasks(prev => [newTask, ...prev]);
        
        setNotifications(prev => [
          { id: 'n_' + Date.now() + '1', text: `Task auto-created: Interview prep for ${cand.name}.`, time: 'Just now', read: false },
          { id: 'n_' + Date.now() + '2', text: `${cand.name} advanced to Interview stage.`, time: 'Just now', read: false },
          ...prev
        ]);
      } else if (newStage === 'Selected') {
        // Create 2 tasks automatically for selection
        const taskFeedback: Task = {
          id: 't_' + Date.now() + '_feedback',
          type: 'Interview',
          title: `Collect feedback for ${cand.name}'s interview`,
          candidateId: cand.id,
          candidateName: cand.name,
          priority: 'Medium',
          status: 'Pending',
          dueDate: new Date().toISOString().split('T')[0]
        };
        const taskOffer: Task = {
          id: 't_' + Date.now() + '_offer',
          type: 'Document',
          title: `Draft contract and offer sheet for ${cand.name}`,
          candidateId: cand.id,
          candidateName: cand.name,
          priority: 'High',
          status: 'Pending',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        setTasks(prev => [taskOffer, taskFeedback, ...prev]);

        setNotifications(prev => [
          { id: 'n_' + Date.now() + '1', text: `Candidate selected: ${cand.name} is shortlisted.`, time: 'Just now', read: false },
          { id: 'n_' + Date.now() + '2', text: `Task created: Collect feedback for ${cand.name}.`, time: 'Just now', read: false },
          { id: 'n_' + Date.now() + '3', text: `Task created: Draft contract for ${cand.name}.`, time: 'Just now', read: false },
          ...prev
        ]);
      }
    }
  };

  // Tasks
  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const handleToggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Templates
  const handleAddTemplate = (newTemplate: EmailTemplate) => {
    setTemplates(prev => [newTemplate, ...prev]);
  };

  const handleEditTemplate = (updatedTemplate: EmailTemplate) => {
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Action Helpers
  const addActivityLog = (type: ActivityLog['type'], description: string) => {
    const newLog: ActivityLog = {
      id: 'act_' + Date.now(),
      timestamp: new Date().toISOString(),
      type,
      description,
      user: 'Sarah Jenkins'
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleOpenAddModal = (type: 'candidate' | 'job' | 'company' | 'resume') => {
    if (type === 'candidate') {
      setOpenCandidatesResumeOnLoad(false);
      setActiveView('Candidates');
    } else if (type === 'resume') {
      setOpenCandidatesResumeOnLoad(true);
      setActiveView('Candidates');
    } else if (type === 'job') {
      setActiveView('Jobs');
    } else if (type === 'company') {
      setActiveView('Companies');
    }
  };

  const handleSendCandidateList = (jobTitle: string, candidateNames: string[]) => {
    // Simulate sending candidates to parent client company
    const logDescription = `Dispatched talent portfolio (${candidateNames.join(', ')}) for position ${jobTitle}.`;
    addActivityLog('Candidate', logDescription);
    
    setNotifications(prev => [
      { id: 'n_' + Date.now(), text: `Talent list shared: ${candidateNames.length} applicants sent for ${jobTitle}.`, time: 'Just now', read: false },
      ...prev
    ]);
  };

  const isCustomTheme = !['slate', 'dark', 'emerald', 'indigo', 'amber'].includes(theme);

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden text-slate-800 antialiased font-sans theme-${theme} ${isCustomTheme ? 'theme-custom' : ''}`} id="applet-root">
      
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="sidebar-panel"
      >
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Sidebar Header */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm font-display">
                H
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight font-display">Hirly - Recruitment</span>
                <p className="text-[9px] text-slate-400 font-bold tracking-wider font-mono">AI-POWERED ATS</p>
              </div>
            </div>
            
            {/* Close button on mobile sidebar */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg md:hidden cursor-pointer"
              title="Close Menu"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Navigation Links list */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    // Turn off any transient navigation modifiers
                    if (item.name !== 'Candidates') {
                      setOpenCandidatesResumeOnLoad(false);
                    }
                    setActiveView(item.name);
                    setIsMobileSidebarOpen(false); // Auto-close drawer on link click
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold rounded-lg text-left transition-all duration-150 cursor-pointer ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100/40' 
                      : 'text-slate-500 hover:bg-slate-100/60 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-sans">{item.name}</span>
                  </div>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.25 rounded bg-blue-100 text-blue-800 border border-blue-200/40">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account block */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div 
            onClick={() => setActiveView('Profile')}
            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-xs uppercase font-sans shrink-0">
                SJ
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate font-display">Sarah Jenkins</p>
                <p className="text-[10px] text-slate-400 truncate">Lead Recruiter</p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" id="workspace-panel">
        
        {/* Top Header Controls bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white px-4 md:px-8 flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger menu for mobile devices */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden cursor-pointer"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Simple Search bar */}
            <div className="relative w-36 sm:w-60 md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            
            {/* Simple instant global search list matches */}
            {globalSearch.trim() !== '' && (
              <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 text-xs">
                {candidates
                  .filter(c => c.name.toLowerCase().includes(globalSearch.toLowerCase()))
                  .map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => handleGlobalSearchSelect(c.name)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-900 font-sans">{c.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">{c.status}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

          {/* Account notifications / alert controls */}
          <div className="flex items-center gap-4">
            
            {/* Theme selector dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowThemeDropdown(prev => !prev)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                title="Change Theme"
              >
                <Palette className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono hidden md:inline">Theme</span>
              </button>

              {showThemeDropdown && (
                <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 text-xs animate-slide-up">
                  <div className="p-3 bg-slate-50 flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-sans">Visual Themes</span>
                    <button 
                      onClick={() => setShowThemeDropdown(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="p-1.5 space-y-1">
                    {[
                      { id: 'slate', name: 'Classic Slate', color: 'bg-slate-400' },
                      { id: 'emerald', name: 'Deep Emerald', color: 'bg-emerald-500' },
                      { id: 'indigo', name: 'Royal Indigo', color: 'bg-indigo-500' },
                      { id: 'amber', name: 'Warm Amber', color: 'bg-amber-500' },
                      { id: 'dark', name: 'Cosmic Dark', color: 'bg-slate-900' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          localStorage.setItem('apex-theme', t.id);
                          setShowThemeDropdown(false);
                          showToast(`✓ Switched to ${t.name} theme!`, 'success');
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors ${
                          theme === t.id ? 'bg-blue-50/50 border border-blue-100 font-bold' : 'border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-3.5 w-3.5 rounded-full ${t.color} border border-white shadow-2xs`} />
                          <span className="font-medium text-slate-700">{t.name}</span>
                        </div>
                        {theme === t.id && (
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            {/* Notification alert bells */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsDropdown(prev => !prev)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition-colors relative"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Notification overlay cards */}
              {showNotificationsDropdown && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200/80 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 text-xs animate-slide-up">
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Notifications</span>
                    <button 
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setShowNotificationsDropdown(false);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  </div>
                  
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">No active alerts.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 hover:bg-slate-50/50 flex items-start gap-2.5 ${n.read ? 'opacity-70' : ''}`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-slate-800 leading-normal">{n.text}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 font-sans hidden sm:inline">Sarah Jenkins</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded font-medium">ONLINE</span>
            </div>

          </div>

        </header>

        {/* Main scrollable View panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
          
          {activeView === 'Dashboard' && (
            <DashboardView
              candidates={candidates}
              jobs={jobs}
              companies={companies}
              tasks={tasks}
              onNavigate={(view) => {
                setOpenCandidatesResumeOnLoad(false);
                setActiveView(view as ViewName);
              }}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

          {activeView === 'Companies' && (
            <CompaniesView
              companies={companies}
              jobs={jobs}
              candidates={candidates}
              onAddCompany={handleAddCompany}
              onEditCompany={handleEditCompany}
              onDeleteCompany={handleDeleteCompany}
              onNavigateToJobs={(cId) => setActiveView('Jobs')}
              onOpenAddJobModal={(cId) => {
                setActiveView('Jobs');
                // The job form opens cleanly in Jobs table
              }}
              onEditCandidate={handleEditCandidate}
              onAddJob={handleAddJob}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              onComposeEmail={(c) => {
                setEmailComposeCandidate(c);
                setEmailComposePreselectedJob(null);
              }}
              onComposeWhatsApp={(c) => {
                setWhatsappComposeCandidate(c);
                setWhatsappComposePreselectedJob(null);
              }}
              onOpenCSVImport={handleOpenCSVImport}
            />
          )}

          {activeView === 'Jobs' && (
            <JobsView
              jobs={jobs}
              companies={companies}
              candidates={candidates}
              onAddJob={handleAddJob}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              onSendCandidateList={handleSendCandidateList}
              onEditCandidate={handleEditCandidate}
              onUpdateCandidateStage={handleUpdateCandidateStage}
              onOpenCSVImport={handleOpenCSVImport}
            />
          )}

          {activeView === 'Candidates' && (
            <CandidatesView
              candidates={candidates}
              onAddCandidate={handleAddCandidate}
              onEditCandidate={handleEditCandidate}
              onDeleteCandidate={handleDeleteCandidate}
              openResumeUploadOnLoad={openCandidatesResumeOnLoad}
              communicationLogs={communicationLogs}
              onAddCommunicationLog={(log) => setCommunicationLogs(prev => [log, ...prev])}
              emailConfig={emailConfig}
              jobs={jobs}
              onAddTask={handleAddTask}
              setNotifications={setNotifications}
              showToast={showToast}
              triggerAutoTask={triggerAutoTask}
              onComposeEmail={(c, job) => {
                setEmailComposeCandidate(c);
                setEmailComposePreselectedJob(job || null);
              }}
              onComposeWhatsApp={(c, job) => {
                setWhatsappComposeCandidate(c);
                setWhatsappComposePreselectedJob(job || null);
              }}
              onScheduleInterview={(c) => setScheduleInterviewCandidate(c)}
              onAddTaskForCandidate={(c) => setAddTaskCandidate(c)}
              onOpenCSVImport={handleOpenCSVImport}
            />
          )}

          {activeView === 'Pipeline' && (
            <PipelineView
              candidates={candidates}
              jobs={jobs}
              onUpdateCandidateStage={handleUpdateCandidateStage}
            />
          )}

          {activeView === 'Tasks' && (
            <TasksView
              tasks={tasks}
              candidates={candidates}
              onAddTask={handleAddTask}
              onToggleTaskStatus={handleToggleTaskStatus}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onComposeEmail={(c) => {
                setEmailComposeCandidate(c);
                setEmailComposePreselectedJob(null);
              }}
            />
          )}

          {activeView === 'Templates' && (
            <TemplatesView
              templates={templates}
              onAddTemplate={handleAddTemplate}
              onEditTemplate={handleEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {activeView === 'Copilot' && (
            <CopilotView
              candidates={candidates}
              jobs={jobs}
              companies={companies}
              tasks={tasks}
              templates={templates}
            />
          )}

          {activeView === 'Settings' && (
            <SettingsView 
              teamMembers={teamMembers}
              setTeamMembers={setTeamMembers}
              emailConfig={emailConfig}
              setEmailConfig={setEmailConfig}
              addActivityLog={addActivityLog}
              setNotifications={setNotifications}
              showToast={showToast}
              currentThemeId={theme}
              onThemeChanged={(themeId) => setTheme(themeId)}
            />
          )}

          {activeView === 'Profile' && (
            <ProfileView />
          )}

        </main>

      </div>

      {/* Global Modals */}
      {emailComposeCandidate && (
        <EmailComposeModal 
          candidate={emailComposeCandidate}
          candidates={candidates}
          jobs={jobs}
          templates={templates}
          emailConfig={emailConfig}
          onClose={() => {
            setEmailComposeCandidate(null);
            setEmailComposePreselectedJob(null);
          }}
          preselectedJobId={emailComposePreselectedJob?.id}
          onSend={(log, autoCreateTask) => {
            setCommunicationLogs(prev => [log, ...prev]);
            if (autoCreateTask) {
              triggerAutoTask(emailComposeCandidate, 'email_sent');
            }
          }}
          showToast={showToast}
        />
      )}

      {whatsappComposeCandidate && (
        <WhatsAppComposeModal 
          candidate={whatsappComposeCandidate}
          candidates={candidates}
          jobs={jobs}
          companyName="Hirly - Recruitment"
          preselectedJob={whatsappComposePreselectedJob || undefined}
          onClose={() => {
            setWhatsappComposeCandidate(null);
            setWhatsappComposePreselectedJob(null);
          }}
          onSend={(log, autoCreateTask) => {
            setCommunicationLogs(prev => [log, ...prev]);
            if (autoCreateTask) {
              triggerAutoTask(whatsappComposeCandidate, 'whatsapp_sent');
            }
          }}
          showToast={showToast}
        />
      )}

      {scheduleInterviewCandidate && (
        <InterviewSchedulerModal 
          candidate={scheduleInterviewCandidate}
          jobs={jobs}
          onClose={() => setScheduleInterviewCandidate(null)}
          onSchedule={(title, date, log, autoCreateTask) => {
            setCommunicationLogs(prev => [log, ...prev]);
            // Create interview task
            const newTask: Task = {
              id: 't_' + Date.now(),
              type: 'Interview',
              title: title,
              candidateId: scheduleInterviewCandidate.id,
              candidateName: scheduleInterviewCandidate.name,
              priority: 'High',
              status: 'Pending',
              dueDate: date.split(' ')[0]
            };
            setTasks(prev => [newTask, ...prev]);
            
            // Create activity log
            addActivityLog('Candidate', `Scheduled interview with ${scheduleInterviewCandidate.name} for ${date}.`);

            // Trigger follow up task
            if (autoCreateTask) {
              triggerAutoTask(scheduleInterviewCandidate, 'interview_scheduled');
            }
          }}
          showToast={showToast}
        />
      )}

      {addTaskCandidate && (
        <AddTaskModal 
          candidate={addTaskCandidate}
          onClose={() => setAddTaskCandidate(null)}
          onAddTask={(task) => {
            setTasks(prev => [task, ...prev]);
            addActivityLog('Candidate', `Created task: "${task.title}" for ${addTaskCandidate.name}.`);
          }}
          showToast={showToast}
        />
      )}

      {isCSVImportOpen && (
        <CSVImportModal 
          isOpen={isCSVImportOpen}
          onClose={() => setIsCSVImportOpen(false)}
          companies={companies}
          jobs={jobs}
          onAddCompany={handleAddCompany}
          onAddJob={handleAddJob}
          onAddCandidate={handleAddCandidate}
          showToast={showToast}
          initialType={csvImportInitialType}
          onStartBackgroundImport={startBackgroundImport}
          activeImportTask={activeImportTask}
          onPause={handlePauseImport}
          onResume={handleResumeImport}
          onCancel={handleCancelImport}
          onDownloadReport={handleDownloadImportReport}
          onViewResults={handleViewImportedResults}
          onRollbackImport={handleRollbackImport}
        />
      )}

      {activeImportTask && (
        <BackgroundImportWidget
          task={activeImportTask}
          onPause={handlePauseImport}
          onResume={handleResumeImport}
          onCancel={handleCancelImport}
          onClose={() => {
            setActiveImportTask(null);
            activeImportTaskRef.current = null;
          }}
          onViewResults={handleViewImportedResults}
          onDownloadReport={handleDownloadImportReport}
          onMaximize={() => setIsCSVImportOpen(true)}
        />
      )}

      {/* Elegant Toast Overlay */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[9999] px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100'
        }`}>
          {toast.type === 'success' ? (
            <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
          ) : (
            <div className="h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">!</div>
          )}
          <span>{toast.text}</span>
        </div>
      )}

    </div>
  );
}
