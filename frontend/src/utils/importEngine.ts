import { Company, Job, Candidate, Task, EmailTemplate } from '../types';
import * as XLSX from 'xlsx';

// Define the shape of validation error logs
export interface ErrorLog {
  row: number;
  reason: string;
  fix: string;
  field: string;
  value: string;
}

// Global Import Task details
export interface ImportTask {
  id: string;
  fileName: string;
  importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates';
  status: 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled';
  totalRows: number;
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  skippedCount: number;
  currentChunk: number;
  totalChunks: number;
  speed: number; // records per second
  startTime: number;
  elapsedTime: number; // in ms
  estimatedTimeRemaining: number; // in seconds
  errorLogs: ErrorLog[];
  duplicateStrategy: 'skip' | 'update' | 'create';
  defaultValues: Record<string, string>;
  mapping: Record<string, number>;
  rawHeaders: string[];
  rawRows: string[][];
  errorMessage?: string;
}

// 1. Data Cleaning Utilities with Strict Guards
export function cleanEmail(email: any): string {
  if (email === undefined || email === null) return '';
  return String(email).trim().toLowerCase();
}

export function cleanPhone(phone: any): string {
  if (phone === undefined || phone === null) return '';
  const cleaned = String(phone).trim();
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.replace(/[^\d]/g, '');
  }
  return cleaned.replace(/[^\d]/g, '');
}

export function cleanName(name: any): string {
  if (name === undefined || name === null) return '';
  const str = String(name).trim();
  if (!str) return '';
  
  const words = str.split(/\s+/);
  if (!Array.isArray(words)) return '';
  
  return words
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');
}

export function cleanSkills(skillsStr: any): string[] {
  if (skillsStr === undefined || skillsStr === null) return [];
  const str = String(skillsStr).trim();
  if (!str) return [];
  
  const skills = str
    .split(/[,;|/\t]/) // split on commas, semicolons, pipes, slashes, or tabs
    .map(s => s.trim())
    .filter(Boolean);
  
  if (!Array.isArray(skills)) return [];
  
  // Deduplicate and capitalize
  const uniqueSkills = Array.from(new Set(skills));
  return uniqueSkills;
}

export function cleanExperience(exp: any): string {
  if (exp === undefined || exp === null) return '0 Years';
  const trimmed = String(exp).trim();
  if (!trimmed) return '0 Years';
  // If it's just a number, append 'Years'
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed} Years`;
  }
  return trimmed;
}

export function cleanSalary(salary: any): string {
  if (salary === undefined || salary === null) return 'N/A';
  return String(salary).trim();
}

/**
 * Standardizes Dates to YYYY-MM-DD
 */
export function cleanDate(dateStr: any): string {
  if (dateStr === undefined || dateStr === null) return new Date().toISOString().split('T')[0];
  const trimmed = String(dateStr).trim();
  if (!trimmed) return new Date().toISOString().split('T')[0];
  
  // Try to parse standard date
  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().split('T')[0];
  }

  // Handle common Indian/UK format: DD/MM/YYYY
  const partsDmy = trimmed.split(/[-/.]/);
  if (Array.isArray(partsDmy) && partsDmy.length === 3) {
    const p0 = parseInt(partsDmy[0] ?? '');
    const p1 = parseInt(partsDmy[1] ?? '');
    const p2 = parseInt(partsDmy[2] ?? '');
    
    if (p0 > 12 && p0 <= 31 && p1 <= 12) {
      // Confirmed DD/MM/YYYY
      const formatted = `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
      if (!isNaN(new Date(formatted).getTime())) return formatted;
    } else if (p0 <= 12 && p1 <= 12) {
      // Ambiguous, assume MM/DD/YYYY but format cleanly
      const formatted = `${p2}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      if (!isNaN(new Date(formatted).getTime())) return formatted;
    }
  }

  return trimmed; // Fallback
}

/**
 * Extracts numeric experience (e.g. "5.5 years" -> 5.5, "senior (8 yrs)" -> 8)
 */
export function parseNumericExperience(expStr: any): number {
  if (expStr === undefined || expStr === null) return 0;
  const str = String(expStr).trim();
  const match = str.match(/(\d+(\.\d+)?)/);
  if (match && Array.isArray(match) && match[1]) {
    return parseFloat(match[1]);
  }
  return 0;
}

// 2. Comprehensive Multi-Type Data Validation Utilities with Strict Type Guards
export function validateRecord(
  item: Record<string, any>,
  importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates',
  rowNum: number,
  existingEmails: Set<string>,
  existingPhones: Set<string>
): { errors: ErrorLog[]; warnings: ErrorLog[] } {
  const errors: ErrorLog[] = [];
  const warnings: ErrorLog[] = [];

  if (!item || typeof item !== 'object') {
    errors.push({
      row: rowNum,
      field: 'row',
      value: '',
      reason: 'Malformed record object',
      fix: 'Review raw spreadsheet alignment.'
    });
    return { errors, warnings };
  }

  // Check empty row (all values are empty)
  const nonValueKeys = ['row', 'id', 'appliedDate', '_isUpdate', '_dupeEmail', '_dupePhone', 'importId'];
  
  const entries = Object.entries(item);
  const allEmpty = Array.isArray(entries) && entries
    .filter(([k]) => !nonValueKeys.includes(k))
    .every(([, v]) => v === undefined || v === null || String(v).trim() === '');

  if (allEmpty) {
    errors.push({
      row: rowNum,
      field: 'row',
      value: 'All Cells Empty',
      reason: 'Empty Row',
      fix: 'This spreadsheet row contains no usable values. It will be skipped.'
    });
    return { errors, warnings };
  }

  if (importType === 'companies') {
    const name = item.name ? String(item.name).trim() : '';
    if (!name) {
      errors.push({
        row: rowNum,
        field: 'name',
        value: '',
        reason: 'Missing required company name',
        fix: 'Add the company name to this cell.'
      });
    }
    const email = item.email ? String(item.email).trim() : '';
    if (email && !email.includes('@')) {
      warnings.push({
        row: rowNum,
        field: 'email',
        value: email,
        reason: 'Invalid company email format',
        fix: 'Double-check or format email with @ symbol.'
      });
    }
  } else if (importType === 'jobs') {
    const title = item.title ? String(item.title).trim() : '';
    const companyName = item.companyName ? String(item.companyName).trim() : '';
    if (!title) {
      errors.push({
        row: rowNum,
        field: 'title',
        value: '',
        reason: 'Missing required Job Title',
        fix: 'Specify the job title.'
      });
    }
    if (!companyName) {
      errors.push({
        row: rowNum,
        field: 'companyName',
        value: '',
        reason: 'Missing required Company Name',
        fix: 'Specify which client company owns this job.'
      });
    }
  } else if (importType === 'candidates') {
    const name = item.name ? String(item.name).trim() : '';
    const email = item.email ? String(item.email).trim() : '';
    const phone = item.phone ? String(item.phone).trim() : '';
    const skills = item.skills ? (Array.isArray(item.skills) ? item.skills : cleanSkills(String(item.skills))) : [];
    const exp = item.experience ? String(item.experience).trim() : '';

    if (!name) {
      errors.push({
        row: rowNum,
        field: 'name',
        value: '',
        reason: 'Missing Name',
        fix: 'Specify the candidate\'s full name.'
      });
    }

    if (!email) {
      errors.push({
        row: rowNum,
        field: 'email',
        value: '',
        reason: 'Missing Email',
        fix: 'Add a valid candidate email address.'
      });
    } else if (!email.includes('@')) {
      errors.push({
        row: rowNum,
        field: 'email',
        value: email,
        reason: 'Invalid Email Format',
        fix: 'Ensure email contains "@" and a valid domain.'
      });
    } else if (existingEmails && existingEmails.has(cleanEmail(email))) {
      warnings.push({
        row: rowNum,
        field: 'email',
        value: email,
        reason: 'Duplicate Email detected',
        fix: 'This email matches an existing candidate in your registry.'
      });
    }

    // Invalid Phone validation
    if (phone) {
      const cleanNum = phone.replace(/\D/g, '');
      if (/[a-zA-Z]/.test(phone)) {
        warnings.push({
          row: rowNum,
          field: 'phone',
          value: phone,
          reason: 'Invalid Phone (Contains letters)',
          fix: 'Remove non-numeric alphabetic characters from the phone field.'
        });
      } else if (cleanNum.length < 7) {
        warnings.push({
          row: rowNum,
          field: 'phone',
          value: phone,
          reason: 'Invalid Phone (Too short)',
          fix: 'Ensure candidate phone number contains at least 7 digits.'
        });
      } else if (existingPhones && existingPhones.has(cleanPhone(phone))) {
        warnings.push({
          row: rowNum,
          field: 'phone',
          value: phone,
          reason: 'Duplicate Phone Number detected',
          fix: 'This phone is already registered in the system.'
        });
      }
    }

    // Missing Skills check
    if (Array.isArray(skills) && skills.length === 0) {
      warnings.push({
        row: rowNum,
        field: 'skills',
        value: '',
        reason: 'Missing Skills',
        fix: 'We recommend adding technical or domain tags to help with job matches.'
      });
    }

    // Invalid Experience check
    if (exp) {
      const numExp = parseNumericExperience(exp);
      if (numExp < 0) {
        warnings.push({
          row: rowNum,
          field: 'experience',
          value: exp,
          reason: 'Invalid Experience (Negative value)',
          fix: 'Ensure experience represents a non-negative number of years.'
        });
      } else if (numExp === 0) {
        const keywords = ['0', 'fresher', 'none', 'trainee', 'entry'];
        const matchesKeywords = Array.isArray(keywords) && keywords.some(k => exp.toLowerCase().includes(k));
        if (!matchesKeywords) {
          warnings.push({
            row: rowNum,
            field: 'experience',
            value: exp,
            reason: 'Unparseable Experience',
            fix: 'Format with numbers (e.g. "5 Years") so our system can filter candidate tenure.'
          });
        }
      }
    }
  } else if (importType === 'tasks') {
    const title = item.title ? String(item.title).trim() : '';
    if (!title) {
      errors.push({
        row: rowNum,
        field: 'title',
        value: '',
        reason: 'Missing required Task Title',
        fix: 'Specify a descriptive task title.'
      });
    }
  } else if (importType === 'templates') {
    const name = item.name ? String(item.name).trim() : '';
    const subject = item.subject ? String(item.subject).trim() : '';
    if (!name) {
      errors.push({
        row: rowNum,
        field: 'name',
        value: '',
        reason: 'Missing required Template Name',
        fix: 'Specify a template configuration name.'
      });
    }
    if (!subject) {
      errors.push({
        row: rowNum,
        field: 'subject',
        value: '',
        reason: 'Missing required Template Subject',
        fix: 'Specify the default subject line.'
      });
    }
  }

  return { errors, warnings };
}

// 3. Saved Templates Management
const LOCAL_STORAGE_KEY = 'ats_import_templates_v1';

export interface MappingTemplate {
  id: string;
  name: string;
  importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates';
  mapping: Record<string, number>;
  createdAt: string;
}

export function saveMappingTemplate(template: Omit<MappingTemplate, 'id' | 'createdAt'>): MappingTemplate {
  const templates = getMappingTemplates();
  const newTemplate: MappingTemplate = {
    ...template,
    id: 'tpl_' + Date.now(),
    createdAt: new Date().toISOString()
  };
  templates.push(newTemplate);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function getMappingTemplates(): MappingTemplate[] {
  try {
    const val = localStorage.getItem(LOCAL_STORAGE_KEY);
    return val ? JSON.parse(val) : getBuiltInTemplates();
  } catch (e) {
    return getBuiltInTemplates();
  }
}

export function deleteMappingTemplate(id: string): void {
  const templates = getMappingTemplates();
  const filtered = Array.isArray(templates) ? templates.filter(t => t.id !== id) : [];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}

function getBuiltInTemplates(): MappingTemplate[] {
  return [
    {
      id: 'tpl_naukri',
      name: 'Naukri Candidate Export',
      importType: 'candidates',
      mapping: {
        name: 1,
        email: 3,
        phone: 2,
        experience: 4,
        skills: 5,
        currentCompany: 6,
        status: -1,
        education: 7,
        notes: 8,
        designation: 9,
        gender: -1,
        city: 10,
        expectedSalary: 11
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'tpl_old_ats',
      name: 'Legacy ATS Migration',
      importType: 'candidates',
      mapping: {
        name: 0,
        email: 1,
        phone: 2,
        experience: 3,
        skills: 4,
        currentCompany: 5,
        status: 6,
        education: 7,
        notes: 8,
        designation: 9,
        gender: 10,
        city: 11,
        expectedSalary: 12
      },
      createdAt: new Date().toISOString()
    }
  ];
}

// 4. Import History Storage Support with Safe Serialization
const HISTORY_STORAGE_KEY = 'ats_import_history_v1';

export interface ImportHistoryItem {
  id: string; // unique import id
  fileName: string;
  importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates';
  status: 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled' | 'rolled_back';
  totalRows: number;
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  skippedCount: number;
  date: string;
  duration: number; // in seconds
  speed: number; // records per second
}

export function getImportHistory(): ImportHistoryItem[] {
  try {
    const val = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!val) return [];
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading import history:', e);
    return [];
  }
}

export function saveImportHistory(history: ImportHistoryItem[]): void {
  try {
    if (Array.isArray(history)) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  } catch (e) {
    console.error('Error saving import history:', e);
  }
}

export function addImportHistoryItem(item: ImportHistoryItem): void {
  const history = getImportHistory();
  if (Array.isArray(history)) {
    // Keep it unique
    const filtered = history.filter(h => h.id !== item.id);
    filtered.unshift(item); // Add newest at front
    saveImportHistory(filtered);
  }
}

export function updateImportHistoryItem(id: string, updates: Partial<ImportHistoryItem>): void {
  const history = getImportHistory();
  if (Array.isArray(history)) {
    const idx = history.findIndex(h => h.id === id);
    if (idx !== -1 && history[idx]) {
      history[idx] = { ...history[idx]!, ...updates };
      saveImportHistory(history);
    }
  }
}
