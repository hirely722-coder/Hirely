import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Company, Job, Candidate, Task, EmailTemplate, ActivityLog, TeamMember, CommunicationLog, EmailConfig, CustomFieldDefinition } from '../types';
import { ImportTask, ImportHistoryItem, cleanEmail, cleanPhone, cleanName, cleanSkills, cleanExperience, cleanSalary, validateRecord, addImportHistoryItem } from '../utils/importEngine';
import { supabase } from '../utils/supabase';

interface AppContextType {
  companies: Company[];
  jobs: Job[];
  candidates: Candidate[];
  tasks: Task[];
  templates: EmailTemplate[];
  activityLogs: ActivityLog[];
  teamMembers: TeamMember[];
  communicationLogs: CommunicationLog[];
  emailConfig: EmailConfig;
  isLoading: boolean;
  
  // CSV Import State & Controls
  activeImportTask: ImportTask | null;
  startBackgroundImport: (
    fileName: string,
    importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates',
    rawHeaders: string[],
    rawRows: string[][],
    columnMap: Record<string, number>,
    defaultValues: Record<string, string>,
    duplicateStrategy: 'skip' | 'update' | 'create'
  ) => void;
  handlePauseImport: () => void;
  handleResumeImport: () => void;
  handleCancelImport: () => void;
  handleDownloadImportReport: (task: ImportTask) => void;
  handleViewImportedResults: (task: ImportTask) => void;
  handleRollbackImport: (task: ImportTask) => void;
  setActiveImportTask: React.Dispatch<React.SetStateAction<ImportTask | null>>;

  // API Methods
  fetchData: () => Promise<void>;
  handleAddCompany: (company: Company) => Promise<void>;
  handleUpdateCompany: (company: Company) => Promise<void>;
  handleDeleteCompany: (id: string) => Promise<void>;
  
  handleAddJob: (job: Job) => Promise<void>;
  handleUpdateJob: (job: Job) => Promise<void>;
  handleDeleteJob: (id: string) => Promise<void>;
  
  handleAddCandidate: (candidate: Candidate) => Promise<void>;
  handleUpdateCandidate: (candidate: Candidate) => Promise<void>;
  handleDeleteCandidate: (id: string) => Promise<void>;
  handleUpdateCandidateStage: (id: string, stage: Candidate['status']) => Promise<void>;
  
  handleAddTask: (task: Task) => Promise<void>;
  handleToggleTaskStatus: (id: string) => Promise<void>;
  handleUpdateTask: (task: Task) => Promise<void>;
  handleDeleteTask: (id: string) => Promise<void>;
  
  handleAddTemplate: (template: EmailTemplate) => Promise<void>;
  handleEditTemplate: (template: EmailTemplate) => Promise<void>;
  handleDeleteTemplate: (id: string) => Promise<void>;
  
  addActivityLog: (type: string, description: string) => Promise<void>;
  
  handleAddTeamMember: (member: TeamMember) => Promise<void>;
  handleUpdateTeamMember: (member: TeamMember) => Promise<void>;
  handleDeleteTeamMember: (id: string) => Promise<void>;
  
  handleAddCommunicationLog: (log: CommunicationLog) => Promise<void>;
  handleSaveEmailConfig: (config: EmailConfig) => Promise<void>;
  
  // Toast & Modals
  toast: { text: string; type: 'success' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'error') => void;
  
  emailComposeCandidate: Candidate | null;
  setEmailComposeCandidate: (c: Candidate | null) => void;
  emailComposePreselectedJob: Job | null;
  setEmailComposePreselectedJob: (j: Job | null) => void;
  
  whatsappComposeCandidate: Candidate | null;
  setWhatsappComposeCandidate: (c: Candidate | null) => void;
  whatsappComposePreselectedJob: Job | null;
  setWhatsappComposePreselectedJob: (j: Job | null) => void;
  
  scheduleInterviewCandidate: Candidate | null;
  setScheduleInterviewCandidate: (c: Candidate | null) => void;
  
  addTaskCandidate: Candidate | null;
  setAddTaskCandidate: (c: Candidate | null) => void;

  customFieldDefinitions: CustomFieldDefinition[];
  handleAddCustomFieldDef: (def: CustomFieldDefinition) => Promise<void>;
  handleUpdateCustomFieldDef: (def: CustomFieldDefinition) => Promise<void>;
  handleDeleteCustomFieldDef: (id: string) => Promise<void>;

  user: any | null;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_URL = '';

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({ provider: 'Gmail', isConnected: false });
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Global Compose Modals State
  const [emailComposeCandidate, setEmailComposeCandidate] = useState<Candidate | null>(null);
  const [emailComposePreselectedJob, setEmailComposePreselectedJob] = useState<Job | null>(null);
  const [whatsappComposeCandidate, setWhatsappComposeCandidate] = useState<Candidate | null>(null);
  const [whatsappComposePreselectedJob, setWhatsappComposePreselectedJob] = useState<Job | null>(null);
  const [scheduleInterviewCandidate, setScheduleInterviewCandidate] = useState<Candidate | null>(null);
  const [addTaskCandidate, setAddTaskCandidate] = useState<Candidate | null>(null);

  // CSV Import States
  const [activeImportTask, setActiveImportTask] = useState<ImportTask | null>(null);
  const activeImportTaskRef = useRef<ImportTask | null>(null);
  activeImportTaskRef.current = activeImportTask;

  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setToken(null);
      showToast('Successfully logged out');
    } catch (err) {
      showToast('Failed to log out', 'error');
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    };
    return fetch(url, { ...options, headers });
  };

  const fetchData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [
        companiesRes,
        jobsRes,
        candidatesRes,
        tasksRes,
        templatesRes,
        activityLogsRes,
        teamMembersRes,
        communicationLogsRes,
        emailConfigRes,
        customFieldDefinitionsRes
      ] = await Promise.all([
        fetchWithAuth(`${API_URL}/api/companies`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/jobs`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/candidates`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/tasks`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/email_templates`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/activity_logs`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/team_members`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/communication_logs`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/email-config`).then(r => r.json()),
        fetchWithAuth(`${API_URL}/api/custom_field_definitions`).then(r => r.json())
      ]);

      setCompanies(companiesRes || []);
      setJobs(jobsRes || []);
      setCandidates(candidatesRes || []);
      setTasks(tasksRes || []);
      setTemplates(templatesRes || []);
      setActivityLogs(activityLogsRes || []);
      setTeamMembers(teamMembersRes || []);
      setCommunicationLogs(communicationLogsRes || []);
      setEmailConfig(emailConfigRes || { provider: 'Gmail', isConnected: false });
      setCustomFieldDefinitions(customFieldDefinitionsRes || []);
    } catch (err: any) {
      console.error('Failed to fetch data from Hono backend:', err);
      showToast('Failed to connect to backend server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setCompanies([]);
      setJobs([]);
      setCandidates([]);
      setTasks([]);
      setTemplates([]);
      setActivityLogs([]);
      setTeamMembers([]);
      setCommunicationLogs([]);
      setEmailConfig({ provider: 'Gmail', isConnected: false });
      setCustomFieldDefinitions([]);
      setIsLoading(false);
    }
  }, [token]);

  // API Handlers (CRUD operations synced to backend)
  const handleAddCompany = async (company: Company) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to add company');
      }
      setCompanies(prev => [data, ...prev]);
      showToast('✓ Company added successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to add company', 'error');
    }
  };

  const handleUpdateCompany = async (company: Company) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to update company');
      }
      setCompanies(prev => prev.map(c => c.id === company.id ? data : c));
      showToast('✓ Company updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update company', 'error');
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/companies/${id}`, { method: 'DELETE' });
      setCompanies(prev => prev.filter(c => c.id !== id));
      showToast('Company deleted successfully');
    } catch (err) {
      showToast('Failed to delete company', 'error');
    }
  };

  const handleAddJob = async (job: Job) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to post job');
      }
      setJobs(prev => [data, ...prev]);
      showToast('✓ Job posted successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to post job', 'error');
    }
  };

  const handleUpdateJob = async (job: Job) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to update job');
      }
      setJobs(prev => prev.map(j => j.id === job.id ? data : j));
      showToast('✓ Job updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update job', 'error');
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/jobs/${id}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(j => j.id !== id));
      showToast('Job deleted successfully');
    } catch (err) {
      showToast('Failed to delete job', 'error');
    }
  };

  const handleAddCandidate = async (candidate: Candidate) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to register candidate');
      }
      setCandidates(prev => [data, ...prev]);
      showToast('✓ Candidate registered successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to register candidate', 'error');
    }
  };

  const handleUpdateCandidate = async (candidate: Candidate) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to update candidate');
      }
      setCandidates(prev => prev.map(c => c.id === candidate.id ? data : c));
      showToast('✓ Candidate updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update candidate', 'error');
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/candidates/${id}`, { method: 'DELETE' });
      setCandidates(prev => prev.filter(c => c.id !== id));
      showToast('Candidate deleted successfully');
    } catch (err) {
      showToast('Failed to delete candidate', 'error');
    }
  };

  const handleUpdateCandidateStage = async (id: string, stage: Candidate['status']) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    await handleUpdateCandidate({ ...candidate, status: stage });
  };

  const handleAddTask = async (task: Task) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      const data = await res.json();
      setTasks(prev => [data, ...prev]);
      showToast('✓ Task created successfully!');
    } catch (err) {
      showToast('Failed to create task', 'error');
    }
  };

  const handleToggleTaskStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updatedStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await fetchWithAuth(`${API_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: updatedStatus })
      });
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? data : t));
    } catch (err) {
      showToast('Failed to update task status', 'error');
    }
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === task.id ? data : t));
      showToast('✓ Task updated successfully!');
    } catch (err) {
      showToast('Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast('Task deleted successfully');
    } catch (err) {
      showToast('Failed to delete task', 'error');
    }
  };

  const handleAddTemplate = async (template: EmailTemplate) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/email_templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      const data = await res.json();
      setTemplates(prev => [data, ...prev]);
      showToast('✓ Template created successfully!');
    } catch (err) {
      showToast('Failed to create template', 'error');
    }
  };

  const handleEditTemplate = async (template: EmailTemplate) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/email_templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      const data = await res.json();
      setTemplates(prev => prev.map(t => t.id === template.id ? data : t));
      showToast('✓ Template updated successfully!');
    } catch (err) {
      showToast('Failed to update template', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/email_templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted');
    } catch (err) {
      showToast('Failed to delete template', 'error');
    }
  };

  const addActivityLog = async (type: string, description: string) => {
    try {
      const newLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date().toISOString(),
        type,
        description,
        user: 'Sarah Jenkins'
      };
      const res = await fetchWithAuth(`${API_URL}/api/activity_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
      const data = await res.json();
      setActivityLogs(prev => [data, ...prev]);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const handleAddTeamMember = async (member: TeamMember) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/team_members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
      const data = await res.json();
      setTeamMembers(prev => [data, ...prev]);
      showToast('✓ Team member added successfully!');
    } catch (err) {
      showToast('Failed to add team member', 'error');
    }
  };

  const handleUpdateTeamMember = async (member: TeamMember) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/team_members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
      const data = await res.json();
      setTeamMembers(prev => prev.map(m => m.id === member.id ? data : m));
      showToast('✓ Team member updated successfully!');
    } catch (err) {
      showToast('Failed to update team member', 'error');
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/team_members/${id}`, { method: 'DELETE' });
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      showToast('Team member removed');
    } catch (err) {
      showToast('Failed to remove team member', 'error');
    }
  };

  const handleAddCommunicationLog = async (log: CommunicationLog) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/communication_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      const data = await res.json();
      setCommunicationLogs(prev => [data, ...prev]);
    } catch (err) {
      console.error('Failed to add communication log:', err);
    }
  };

  const handleSaveEmailConfig = async (config: EmailConfig) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/email-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      setEmailConfig(data);
      showToast('✓ Email configuration saved successfully!');
    } catch (err) {
      showToast('Failed to save configuration', 'error');
    }
  };

  // -------------------------------------------------------------
  // Background Import Processor (running via chunk API pushes to Hono)
  // -------------------------------------------------------------
  const startBackgroundImport = (
    fileName: string,
    importType: 'companies' | 'jobs' | 'candidates' | 'tasks' | 'templates',
    rawHeaders: string[],
    rawRows: string[][],
    columnMap: Record<string, number>,
    defaultValues: Record<string, string>,
    duplicateStrategy: 'skip' | 'update' | 'create'
  ) => {
    const chunkSize = 250;
    const totalRows = rawRows ? rawRows.length : 0;
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
    processNextChunk(task.id, 0, chunkSize);
  };

  const processNextChunk = (taskId: string, chunkIndex: number, chunkSize: number) => {
    setTimeout(async () => {
      const task = activeImportTaskRef.current;
      if (!task || task.id !== taskId) return;
      if (task.status === 'paused') return;
      if (task.status === 'failed' || task.status === 'completed') return;

      const startIdx = chunkIndex * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, task.totalRows);
      const chunkRows = task.rawRows.slice(startIdx, endIdx);

      const existingEmails = new Set<string>();
      const existingPhones = new Set<string>();
      candidatesRef.current.forEach(c => {
        if (c.email) existingEmails.add(cleanEmail(c.email));
        if (c.phone) existingPhones.add(cleanPhone(c.phone));
      });

      let imported = 0;
      let failed = 0;
      let duplicate = 0;
      let skipped = 0;
      const chunkErrorLogs: any[] = [];

      const newCandidates: Candidate[] = [];
      const newCompanies: Company[] = [];
      const newJobs: Job[] = [];

      const fieldsToMap = Object.keys(task.mapping);

      chunkRows.forEach((row, index) => {
        const rowNum = startIdx + index + 1;
        try {
          const record: Record<string, any> = {};
          fieldsToMap.forEach(field => {
            const colIdx = task.mapping[field];
            record[field] = (colIdx !== undefined && colIdx !== -1 && colIdx < row.length) ? (row[colIdx] ?? '') : '';
          });

          if (task.importType === 'candidates') {
            record.name = cleanName(record.name);
            record.email = cleanEmail(record.email);
            record.phone = cleanPhone(record.phone);
            record.skills = cleanSkills(record.skills);
            record.experience = cleanExperience(record.experience);
            record.currentCompany = record.currentCompany?.trim() || '';
            record.education = record.education?.trim() || '';
            record.notes = record.notes?.trim() || '';
            record.designation = record.designation?.trim() || '';
            record.gender = record.gender?.trim() || '';
            record.city = record.city?.trim() || '';
            record.expectedSalary = cleanSalary(record.expectedSalary);
          } else if (task.importType === 'companies') {
            record.name = cleanName(record.name);
            record.email = cleanEmail(record.email);
            record.phone = cleanPhone(record.phone);
            record.website = record.website?.trim() || '';
            record.address = record.address?.trim() || '';
            record.notes = record.notes?.trim() || '';
            record.industry = record.industry?.trim() || '';
          } else if (task.importType === 'jobs') {
            record.title = record.title?.trim() || '';
            record.companyName = record.companyName?.trim() || '';
            record.experience = cleanExperience(record.experience);
            record.location = record.location?.trim() || '';
            record.salary = cleanSalary(record.salary);
            record.requiredSkills = cleanSkills(record.requiredSkills).join(', ');
            record.department = record.department?.trim() || '';
          }

          // Apply fallbacks
          Object.entries(task.defaultValues).forEach(([defKey, defVal]) => {
            if (defVal && (!record[defKey] || record[defKey] === '')) {
              record[defKey] = defVal;
            }
          });

          const { errors } = validateRecord(record, task.importType, rowNum, existingEmails, existingPhones, customFieldDefinitions);
          if (errors.length > 0) {
            failed++;
            chunkErrorLogs.push(...errors);
            return;
          }

          if (task.importType === 'candidates') {
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

          // Map items
          if (task.importType === 'candidates') {
            const coreKeys = [
              'name', 'phone', 'email', 'experience', 'skills', 'currentCompany', 'status',
              'resumeText', 'resumeFileName', 'education', 'address', 'notes', 'appliedDate',
              'designation', 'gender', 'city', 'expectedSalary'
            ];
            const customFieldsObj: Record<string, any> = {};
            fieldsToMap.forEach(f => {
              if (!coreKeys.includes(f)) {
                customFieldsObj[f] = record[f];
              }
            });

            newCandidates.push({
              id: record._isUpdate ? '' : 'cand_bg_' + Date.now() + '_' + rowNum + '_' + Math.random().toString(36).substr(2, 4),
              name: record.name,
              phone: record.phone || 'N/A',
              email: record.email,
              experience: record.experience || '3 Years',
              skills: Array.isArray(record.skills) ? record.skills : cleanSkills(record.skills),
              currentCompany: record.currentCompany || 'Freelancer',
              status: record.status || 'Applied',
              aiMatchScore: 0,
              resumeText: record.resumeText || `Imported profile notes: ${record.notes || ''}`,
              education: record.education || 'High School / Self-taught',
              address: record.address || 'N/A',
              notes: record.notes || 'No added interview logs.',
              appliedDate: new Date().toISOString().split('T')[0],
              designation: record.designation || undefined,
              gender: record.gender || 'Male',
              city: record.city || undefined,
              expectedSalary: record.expectedSalary || undefined,
              importId: task.id,
              customFields: customFieldsObj,
              _isUpdate: record._isUpdate,
              _dupeEmail: record._dupeEmail,
              _dupePhone: record._dupePhone
            } as any);
            imported++;
          } else if (task.importType === 'companies') {
            newCompanies.push({
              id: 'c_bg_' + Date.now() + '_' + rowNum + '_' + Math.random().toString(36).substr(2, 4),
              name: record.name,
              contactPerson: record.contactPerson || 'HR Manager',
              openJobs: 0,
              status: 'Active',
              email: record.email || 'partner@company.com',
              phone: record.phone || 'N/A',
              website: record.website || 'https://example.com',
              address: record.address || 'N/A',
              notes: record.notes || 'Onboarded partner client.',
              recContact: task.defaultValues.recruiterName || 'Sarah Jenkins',
              industry: record.industry || undefined,
              companySize: record.companySize || undefined,
              foundedYear: record.foundedYear || undefined,
              tier: record.tier || undefined,
              linkedInUrl: record.linkedInUrl || undefined,
              importId: task.id
            });
            imported++;
          } else if (task.importType === 'jobs') {
            newJobs.push({
              id: 'j_bg_' + Date.now() + '_' + rowNum + '_' + Math.random().toString(36).substr(2, 4),
              title: record.title,
              companyId: record.companyId || task.defaultValues.companyId || '',
              companyName: record.companyName || '',
              experience: record.experience || '2+ Years',
              location: record.location || 'Remote',
              applicationsCount: 0,
              status: 'Open',
              description: record.description || 'Job description to be added.',
              requiredSkills: cleanSkills(record.requiredSkills),
              salary: record.salary || 'N/A',
              employmentType: record.employmentType || 'Full-time',
              department: record.department || undefined,
              urgency: record.urgency || 'Medium',
              recruiterName: task.defaultValues.recruiterName || 'Sarah Jenkins',
              importId: task.id
            });
            imported++;
          }
        } catch (err: any) {
          failed++;
          chunkErrorLogs.push({
            row: rowNum,
            field: 'generic',
            value: '',
            reason: err.message || 'Row processing failure',
            fix: 'Check structure of row data.'
          });
        }
      });

      // Send batches to Hono backend
      try {
        if (task.importType === 'candidates' && newCandidates.length > 0) {
          // Separate new inserts and updates
          const updates = newCandidates.filter(c => c._isUpdate);
          const inserts = newCandidates.filter(c => !c._isUpdate);

          if (inserts.length > 0) {
            await fetchWithAuth(`${API_URL}/api/candidates/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inserts)
            });
          }

          for (const u of updates) {
            // Find existing matching candidate
            const existing = candidatesRef.current.find(c => 
              cleanEmail(c.email) === u._dupeEmail || cleanPhone(c.phone) === u._dupePhone
            );
            if (existing) {
              const cleanedUpdate = { ...u };
              delete cleanedUpdate._isUpdate;
              delete cleanedUpdate._dupeEmail;
              delete cleanedUpdate._dupePhone;
              cleanedUpdate.id = existing.id;
              await fetchWithAuth(`${API_URL}/api/candidates/${existing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedUpdate)
              });
            }
          }
        } else if (task.importType === 'companies' && newCompanies.length > 0) {
          await fetchWithAuth(`${API_URL}/api/companies/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCompanies)
          });
        } else if (task.importType === 'jobs' && newJobs.length > 0) {
          await fetchWithAuth(`${API_URL}/api/jobs/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newJobs)
          });
        }

        // Fetch fresh data from DB to update state reactively
        fetchData();
      } catch (dbErr: any) {
        console.error('Failed to save imported chunk to database:', dbErr);
        showToast('Failed to insert chunk to database', 'error');
      }

      // Update task stats
      const nextChunkIdx = chunkIndex + 1;
      const isCompleted = nextChunkIdx >= task.totalChunks;
      const elapsed = (Date.now() - task.startTime) / 1000;
      const speed = Math.round((startIdx + chunkRows.length) / elapsed);
      const remainingRows = task.totalRows - (startIdx + chunkRows.length);
      const timeRemaining = speed > 0 ? Math.round(remainingRows / speed) : 0;

      const updatedTask: ImportTask = {
        ...task,
        importedCount: task.importedCount + imported,
        failedCount: task.failedCount + failed,
        duplicateCount: task.duplicateCount + duplicate,
        skippedCount: task.skippedCount + skipped,
        currentChunk: nextChunkIdx,
        status: isCompleted ? 'completed' : 'processing',
        elapsedTime: Math.round(elapsed),
        speed,
        estimatedTimeRemaining: isCompleted ? 0 : timeRemaining,
        errorLogs: [...task.errorLogs, ...chunkErrorLogs]
      };

      setActiveImportTask(updatedTask);

      // Save to database/history if complete
      if (isCompleted) {
        showToast(`✓ Background import completed successfully! Imported: ${updatedTask.importedCount}`, 'success');
        addActivityLog('System', `Completed background CSV import of ${updatedTask.importedCount} ${task.importType}.`);
      } else {
        processNextChunk(taskId, nextChunkIdx, chunkSize);
      }
    }, 50);
  };

  const handlePauseImport = () => {
    if (activeImportTask) {
      setActiveImportTask(prev => prev ? { ...prev, status: 'paused' } : null);
      showToast('⏸ Import process paused.');
    }
  };

  const handleResumeImport = () => {
    if (activeImportTask) {
      const resumedTask = { ...activeImportTask, status: 'processing' as const, startTime: Date.now() };
      setActiveImportTask(resumedTask);
      showToast('▶ Resuming import process...');
      processNextChunk(resumedTask.id, resumedTask.currentChunk, 250);
    }
  };

  const handleCancelImport = () => {
    if (activeImportTask) {
      setActiveImportTask(null);
      showToast('❌ Import process cancelled.', 'error');
    }
  };

  const handleDownloadImportReport = (task: ImportTask) => {
    // Generate CSV logs download
    const headers = 'Row,Field,Value,Reason,FixSuggestion\n';
    const rows = task.errorLogs.map(log => 
      `"${log.row}","${log.field}","${log.value ?? ''}","${log.reason}","${log.fix ?? ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_report_${task.importType}_${task.id}.csv`;
    a.click();
    showToast('Downloaded import report.');
  };

  const handleViewImportedResults = (task: ImportTask) => {
    showToast(`Filtering view for imported results of task: ${task.id}`);
  };

  const handleRollbackImport = async (task: ImportTask) => {
    try {
      // Deletes items matching importId
      const deleteEndpoints: Record<string, string> = {
        candidates: 'candidates',
        companies: 'companies',
        jobs: 'jobs'
      };
      
      const table = deleteEndpoints[task.importType];
      if (!table) return;

      const res = await fetchWithAuth(`${API_URL}/api/${table}?importId=${task.id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        throw new Error('Failed to execute rollback request.');
      }

      showToast(`✓ Rolled back import for task ${task.id}!`);
      fetchData();
    } catch (err: any) {
      showToast('Failed to rollback import', 'error');
    }
  };

  const handleAddCustomFieldDef = async (def: CustomFieldDefinition) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/custom_field_definitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(def)
      });
      const data = await res.json();
      setCustomFieldDefinitions(prev => [data, ...prev]);
      showToast('✓ Custom Field created successfully!');
    } catch (err) {
      showToast('Failed to create custom field', 'error');
    }
  };

  const handleUpdateCustomFieldDef = async (def: CustomFieldDefinition) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/custom_field_definitions/${def.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(def)
      });
      const data = await res.json();
      setCustomFieldDefinitions(prev => prev.map(d => d.id === def.id ? data : d));
      showToast('✓ Custom Field updated successfully!');
    } catch (err) {
      showToast('Failed to update custom field', 'error');
    }
  };

  const handleDeleteCustomFieldDef = async (id: string) => {
    try {
      await fetchWithAuth(`${API_URL}/api/custom_field_definitions/${id}`, { method: 'DELETE' });
      setCustomFieldDefinitions(prev => prev.filter(d => d.id !== id));
      showToast('Custom Field deleted');
    } catch (err) {
      showToast('Failed to delete custom field', 'error');
    }
  };

  return (
    <AppContext.Provider value={{
      companies,
      jobs,
      candidates,
      tasks,
      templates,
      activityLogs,
      teamMembers,
      communicationLogs,
      emailConfig,
      isLoading,
      
      // Compose Modal states
      emailComposeCandidate,
      setEmailComposeCandidate,
      emailComposePreselectedJob,
      setEmailComposePreselectedJob,
      whatsappComposeCandidate,
      setWhatsappComposeCandidate,
      whatsappComposePreselectedJob,
      setWhatsappComposePreselectedJob,
      scheduleInterviewCandidate,
      setScheduleInterviewCandidate,
      addTaskCandidate,
      setAddTaskCandidate,

      // Import States
      activeImportTask,
      startBackgroundImport,
      handlePauseImport,
      handleResumeImport,
      handleCancelImport,
      handleDownloadImportReport,
      handleViewImportedResults,
      handleRollbackImport,
      setActiveImportTask,

      // API operations
      fetchData,
      handleAddCompany,
      handleUpdateCompany,
      handleDeleteCompany,
      handleAddJob,
      handleUpdateJob,
      handleDeleteJob,
      handleAddCandidate,
      handleUpdateCandidate,
      handleDeleteCandidate,
      handleUpdateCandidateStage,
      handleAddTask,
      handleToggleTaskStatus,
      handleUpdateTask,
      handleDeleteTask,
      handleAddTemplate,
      handleEditTemplate,
      handleDeleteTemplate,
      addActivityLog,
      handleAddTeamMember,
      handleUpdateTeamMember,
      handleDeleteTeamMember,
      handleAddCommunicationLog,
      handleSaveEmailConfig,
      
      customFieldDefinitions,
      handleAddCustomFieldDef,
      handleUpdateCustomFieldDef,
      handleDeleteCustomFieldDef,

      toast,
      showToast,
      user,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};
