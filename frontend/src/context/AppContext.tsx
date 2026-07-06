import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Company, Job, Candidate, Task, EmailTemplate, ActivityLog, TeamMember, CommunicationLog, EmailConfig, CustomFieldDefinition, WorkspaceRole, RbacAuditLog } from '../types';
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

  workspaceRoles: WorkspaceRole[];
  lockedFeatures: string[];
  rbacAuditLogs: RbacAuditLog[];
  currentUserRole: string;
  currentUserPermissions: string[];
  currentUserRestrictedFeatures: string[];

  handleSaveRolePermissions: (roleId: string, permissions: string[]) => Promise<void>;
  handleCreateCustomRole: (name: string, permissions: string[]) => Promise<void>;
  handleDeleteCustomRole: (roleId: string) => Promise<void>;
  handleToggleFeatureLock: (lockedFeatures: string[]) => Promise<void>;
  fetchRbacAuditLogs: () => Promise<void>;

  notifications: Array<{ id: string; text: string; time: string; read: boolean }>;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ id: string; text: string; time: string; read: boolean }>>>;
  addNotification: (text: string) => void;

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
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRole[]>([]);
  const [lockedFeatures, setLockedFeatures] = useState<string[]>([]);
  const [rbacAuditLogs, setRbacAuditLogs] = useState<RbacAuditLog[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRestrictedFeatures, setCurrentUserRestrictedFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([]);
  const notificationsLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('hirely_cache_notifications');
      if (cached) {
        setNotifications(JSON.parse(cached));
      } else {
        const defaults = [
          { id: 'n1', text: 'Sarah Connor scheduled AWS Interview.', time: '2 mins ago', read: false },
          { id: 'n2', text: 'New candidate Emily Watson applied for Senior React Developer.', time: '1 hour ago', read: false },
          { id: 'n3', text: 'Weekly pipeline sync report is ready.', time: 'Yesterday', read: true }
        ];
        setNotifications(defaults);
      }
      notificationsLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && notificationsLoadedRef.current) {
      localStorage.setItem('hirely_cache_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  const addNotification = (text: string) => {
    setNotifications(prev => {
      const next = [
        {
          id: 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          text,
          time: 'Just now',
          read: false
        },
        ...prev
      ];
      return next;
    });
  };

  const currentUserProfile = teamMembers.find(m => m.id === user?.id);
  const workspaceId = currentUserProfile?.workspaceId;

  // Real-time subscriptions for permissions/roles changes
  useEffect(() => {
    if (!user) return;

    console.log(`Setting up real-time subscription for profile changes: public.profiles.id=eq.${user.id}`);
    const profileChannel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload: any) => {
          console.log('Real-time profile update detected:', payload.new);
          await fetchData();
          addNotification('⚠️ Your access permissions have been updated by the workspace administrator.');
          showToast('⚠️ Your access permissions have been updated by the workspace administrator.', 'success');
        }
      )
      .subscribe();

    // Listen to changes to workspace roles in the same workspace
    let rolesChannel: any = null;
    if (workspaceId) {
      console.log(`Setting up real-time subscription for role changes in workspace: ${workspaceId}`);
      rolesChannel = supabase
        .channel(`workspace-roles-${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workspace_roles',
            filter: `workspace_id=eq.${workspaceId}`
          },
          async (payload: any) => {
            console.log('Real-time workspace role updated detected:', payload);
            await fetchData();
            addNotification('⚠️ Workspace roles and permissions have been updated.');
            showToast('⚠️ Workspace roles and permissions have been updated.', 'success');
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(profileChannel);
      if (rolesChannel) {
        supabase.removeChannel(rolesChannel);
      }
    };
  }, [user, workspaceId]);

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
      
      // Clear SWR cache on logout
      localStorage.removeItem('hirely_cache_companies');
      localStorage.removeItem('hirely_cache_jobs');
      localStorage.removeItem('hirely_cache_candidates');
      localStorage.removeItem('hirely_cache_tasks');
      localStorage.removeItem('hirely_cache_templates');
      localStorage.removeItem('hirely_cache_activity_logs');
      localStorage.removeItem('hirely_cache_team_members');
      localStorage.removeItem('hirely_cache_communication_logs');
      localStorage.removeItem('hirely_cache_email_config');
      localStorage.removeItem('hirely_cache_custom_field_definitions');
      localStorage.removeItem('hirely_cache_workspace_roles');
      localStorage.removeItem('hirely_cache_locked_features');
      localStorage.removeItem('hirely_cache_rbac_audit_logs');
      localStorage.removeItem('hirely_cache_current_user_role');
      localStorage.removeItem('hirely_cache_current_user_permissions');
      localStorage.removeItem('hirely_cache_user_id');

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

  // Load initial cached data from localStorage (SWR cache resolution)
  useEffect(() => {
    if (!user) return;

    try {
      const cachedUserId = localStorage.getItem('hirely_cache_user_id');
      if (cachedUserId && cachedUserId !== user.id) {
        // Different user logged in, clear all caches!
        localStorage.removeItem('hirely_cache_companies');
        localStorage.removeItem('hirely_cache_jobs');
        localStorage.removeItem('hirely_cache_candidates');
        localStorage.removeItem('hirely_cache_tasks');
        localStorage.removeItem('hirely_cache_templates');
        localStorage.removeItem('hirely_cache_activity_logs');
        localStorage.removeItem('hirely_cache_team_members');
        localStorage.removeItem('hirely_cache_communication_logs');
        localStorage.removeItem('hirely_cache_email_config');
        localStorage.removeItem('hirely_cache_custom_field_definitions');
        localStorage.removeItem('hirely_cache_workspace_roles');
        localStorage.removeItem('hirely_cache_locked_features');
        localStorage.removeItem('hirely_cache_rbac_audit_logs');
        localStorage.removeItem('hirely_cache_current_user_role');
        localStorage.removeItem('hirely_cache_current_user_permissions');
        localStorage.removeItem('hirely_cache_current_user_restricted_features');
        localStorage.removeItem('hirely_cache_user_id');
        
        // Reset states
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
        setWorkspaceRoles([]);
        setLockedFeatures([]);
        setRbacAuditLogs([]);
        setCurrentUserRole('');
        setCurrentUserPermissions([]);
        setCurrentUserRestrictedFeatures([]);
        setIsLoading(true);
        return;
      }

      // If no cached user id, set it
      if (!cachedUserId) {
        localStorage.setItem('hirely_cache_user_id', user.id);
      }

      const cachedCompanies = localStorage.getItem('hirely_cache_companies');
      const cachedJobs = localStorage.getItem('hirely_cache_jobs');
      const cachedCandidates = localStorage.getItem('hirely_cache_candidates');
      const cachedTasks = localStorage.getItem('hirely_cache_tasks');
      const cachedTemplates = localStorage.getItem('hirely_cache_templates');
      const cachedActivityLogs = localStorage.getItem('hirely_cache_activity_logs');
      const cachedTeamMembers = localStorage.getItem('hirely_cache_team_members');
      const cachedCommunicationLogs = localStorage.getItem('hirely_cache_communication_logs');
      const cachedEmailConfig = localStorage.getItem('hirely_cache_email_config');
      const cachedCustomFieldDefs = localStorage.getItem('hirely_cache_custom_field_definitions');
      const cachedRoles = localStorage.getItem('hirely_cache_workspace_roles');
      const cachedLocks = localStorage.getItem('hirely_cache_locked_features');
      const cachedAudit = localStorage.getItem('hirely_cache_rbac_audit_logs');
      const cachedRoleName = localStorage.getItem('hirely_cache_current_user_role');
      const cachedPermissions = localStorage.getItem('hirely_cache_current_user_permissions');
      const cachedRestricted = localStorage.getItem('hirely_cache_current_user_restricted_features');

      if (cachedCompanies || cachedJobs || cachedCandidates) {
        if (cachedCompanies) setCompanies(JSON.parse(cachedCompanies));
        if (cachedJobs) setJobs(JSON.parse(cachedJobs));
        if (cachedCandidates) setCandidates(JSON.parse(cachedCandidates));
        if (cachedTasks) setTasks(JSON.parse(cachedTasks));
        if (cachedTemplates) setTemplates(JSON.parse(cachedTemplates));
        if (cachedActivityLogs) setActivityLogs(JSON.parse(cachedActivityLogs));
        if (cachedTeamMembers) setTeamMembers(JSON.parse(cachedTeamMembers));
        if (cachedCommunicationLogs) setCommunicationLogs(JSON.parse(cachedCommunicationLogs));
        if (cachedEmailConfig) setEmailConfig(JSON.parse(cachedEmailConfig));
        if (cachedCustomFieldDefs) setCustomFieldDefinitions(JSON.parse(cachedCustomFieldDefs));
        if (cachedRoles) setWorkspaceRoles(JSON.parse(cachedRoles));
        if (cachedLocks) setLockedFeatures(JSON.parse(cachedLocks));
        if (cachedAudit) setRbacAuditLogs(JSON.parse(cachedAudit));
        if (cachedRoleName) setCurrentUserRole(cachedRoleName);
        if (cachedPermissions) setCurrentUserPermissions(JSON.parse(cachedPermissions));
        if (cachedRestricted) setCurrentUserRestrictedFeatures(JSON.parse(cachedRestricted));
        
        setIsLoading(false); // SWR: Disable loading state immediately as we have cached data
        console.log('Ingested database records from SWR cache.');
      }
    } catch (e) {
      console.warn('Failed to parse cached data from localStorage:', e);
    }
  }, [user]);

  const fetchData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      // If we don't have any cached data loaded, set isLoading to true.
      // If we already loaded cached data, we keep isLoading as false for background sync.
      const cachedCompanies = localStorage.getItem('hirely_cache_companies');
      if (!cachedCompanies) {
        setIsLoading(true);
      }

      console.log('Fetching unified bootstrap payload from backend...');
      const response = await fetchWithAuth(`${API_URL}/api/bootstrap`);
      if (!response.ok) {
        throw new Error(`Bootstrap failed with status ${response.status}`);
      }
      
      const payload = await response.json();

      const companiesData = Array.isArray(payload.companies) ? payload.companies : [];
      const jobsData = Array.isArray(payload.jobs) ? payload.jobs : [];
      const candidatesData = Array.isArray(payload.candidates) ? payload.candidates : [];
      const tasksData = Array.isArray(payload.tasks) ? payload.tasks : [];
      const templatesData = Array.isArray(payload.emailTemplates) ? payload.emailTemplates : [];
      const activityLogsData = Array.isArray(payload.activityLogs) ? payload.activityLogs : [];
      const teamMembersData = Array.isArray(payload.teamMembers) ? payload.teamMembers : [];
      const communicationLogsData = Array.isArray(payload.communicationLogs) ? payload.communicationLogs : [];
      const emailConfigData = payload.emailConfig && !payload.emailConfig.error ? payload.emailConfig : { provider: 'Gmail', isConnected: false };
      const customFieldDefsData = Array.isArray(payload.customFieldDefinitions) ? payload.customFieldDefinitions : [];
      const rolesData = Array.isArray(payload.workspaceRoles) ? payload.workspaceRoles : [];
      const locksData = Array.isArray(payload.lockedFeatures) ? payload.lockedFeatures : [];
      const auditData = Array.isArray(payload.rbacAuditLogs) ? payload.rbacAuditLogs : [];
      const roleNameData = payload.currentUser?.role || 'Viewer';
      const permissionsData = Array.isArray(payload.currentUser?.permissions) ? payload.currentUser.permissions : [];
      const restrictedFeaturesData = Array.isArray(payload.currentUser?.restrictedFeatures) ? payload.currentUser.restrictedFeatures : [];

      setCompanies(companiesData);
      setJobs(jobsData);
      setCandidates(candidatesData);
      setTasks(tasksData);
      setTemplates(templatesData);
      setActivityLogs(activityLogsData);
      setTeamMembers(teamMembersData);
      setCommunicationLogs(communicationLogsData);
      setEmailConfig(emailConfigData);
      setCustomFieldDefinitions(customFieldDefsData);
      setWorkspaceRoles(rolesData);
      setLockedFeatures(locksData);
      setRbacAuditLogs(auditData);
      setCurrentUserRole(roleNameData);
      setCurrentUserPermissions(permissionsData);
      setCurrentUserRestrictedFeatures(restrictedFeaturesData);

      // Save to localStorage cache
      localStorage.setItem('hirely_cache_companies', JSON.stringify(companiesData));
      localStorage.setItem('hirely_cache_jobs', JSON.stringify(jobsData));
      localStorage.setItem('hirely_cache_candidates', JSON.stringify(candidatesData));
      localStorage.setItem('hirely_cache_tasks', JSON.stringify(tasksData));
      localStorage.setItem('hirely_cache_templates', JSON.stringify(templatesData));
      localStorage.setItem('hirely_cache_activity_logs', JSON.stringify(activityLogsData));
      localStorage.setItem('hirely_cache_team_members', JSON.stringify(teamMembersData));
      localStorage.setItem('hirely_cache_communication_logs', JSON.stringify(communicationLogsData));
      localStorage.setItem('hirely_cache_email_config', JSON.stringify(emailConfigData));
      localStorage.setItem('hirely_cache_custom_field_definitions', JSON.stringify(customFieldDefsData));
      localStorage.setItem('hirely_cache_workspace_roles', JSON.stringify(rolesData));
      localStorage.setItem('hirely_cache_locked_features', JSON.stringify(locksData));
      localStorage.setItem('hirely_cache_rbac_audit_logs', JSON.stringify(auditData));
      localStorage.setItem('hirely_cache_current_user_role', roleNameData);
      localStorage.setItem('hirely_cache_current_user_permissions', JSON.stringify(permissionsData));
      localStorage.setItem('hirely_cache_current_user_restricted_features', JSON.stringify(restrictedFeaturesData));

    } catch (err: any) {
      console.error('Failed to fetch bootstrapping data from Hono backend:', err);
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
      setWorkspaceRoles([]);
      setLockedFeatures([]);
      setRbacAuditLogs([]);
      setCurrentUserRole('');
      setCurrentUserPermissions([]);
      setCurrentUserRestrictedFeatures([]);
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
      console.log('[handleUpdateTeamMember] Sending update for:', member.id, 'keys:', Object.keys(member));
      const res = await fetchWithAuth(`${API_URL}/api/team_members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        console.error('[handleUpdateTeamMember] API error:', data);
        showToast(data?.error || 'Failed to update team member', 'error');
        return;
      }
      setTeamMembers(prev => prev.map(m => m.id === member.id ? data : m));
      showToast('✓ Team member updated successfully!');
    } catch (err: any) {
      console.error('[handleUpdateTeamMember] Exception:', err);
      showToast(err.message || 'Failed to update team member', 'error');
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

  const handleSaveRolePermissions = async (roleId: string, permissions: string[]) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/workspace-roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to update role permissions');
      }
      setWorkspaceRoles(prev => prev.map(r => r.id === roleId ? data : r));
      localStorage.setItem('hirely_cache_workspace_roles', JSON.stringify(workspaceRoles.map(r => r.id === roleId ? data : r)));
      showToast('✓ Role permissions updated successfully!');
      await fetchRbacAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'Failed to update role permissions', 'error');
    }
  };

  const handleCreateCustomRole = async (name: string, permissions: string[]) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/workspace-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, permissions })
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to create role');
      }
      setWorkspaceRoles(prev => [...prev, data]);
      localStorage.setItem('hirely_cache_workspace_roles', JSON.stringify([...workspaceRoles, data]));
      showToast('✓ Custom role created successfully!');
      await fetchRbacAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'Failed to create role', 'error');
    }
  };

  const handleDeleteCustomRole = async (roleId: string) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/workspace-roles/${roleId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to delete role');
      }
      setWorkspaceRoles(prev => prev.filter(r => r.id !== roleId));
      localStorage.setItem('hirely_cache_workspace_roles', JSON.stringify(workspaceRoles.filter(r => r.id !== roleId)));
      showToast('Custom role deleted');
      await fetchRbacAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  };

  const handleToggleFeatureLock = async (updatedLockedFeatures: string[]) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/workspace/locked-features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockedFeatures: updatedLockedFeatures })
      });
      const data = await res.json();
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.error || 'Failed to save feature locks');
      }
      setLockedFeatures(updatedLockedFeatures);
      localStorage.setItem('hirely_cache_locked_features', JSON.stringify(updatedLockedFeatures));
      showToast('✓ Feature configuration saved!');
      await fetchRbacAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'Failed to save feature locks', 'error');
    }
  };

  const fetchRbacAuditLogs = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/rbac-audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setRbacAuditLogs(data);
        localStorage.setItem('hirely_cache_rbac_audit_logs', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Failed to fetch security audit logs:', err);
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

      workspaceRoles,
      lockedFeatures,
      rbacAuditLogs,
      currentUserRole,
      currentUserPermissions,
      currentUserRestrictedFeatures,
      handleSaveRolePermissions,
      handleCreateCustomRole,
      handleDeleteCustomRole,
      handleToggleFeatureLock,
      fetchRbacAuditLogs,

      toast,
      showToast,
      user,
      logout,
      notifications,
      setNotifications,
      addNotification
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
