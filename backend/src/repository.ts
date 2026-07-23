import { supabase } from './db';
import { keysToCamel, keysToSnake } from './utils';
import crypto from 'crypto';

interface TableConfig {
  hasUserId?: boolean;
  isAssignmentTable?: boolean;
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  job_assignments: { isAssignmentTable: true },
  company_assignments: { isAssignmentTable: true },
  profiles: { hasUserId: false },
  workspaces: { hasUserId: false },
  workspace_roles: { hasUserId: false },
  email_queue: { hasUserId: false },
  email_integrations: { hasUserId: false },
  invitations: { hasUserId: false },
  subscription_plans: { hasUserId: false },
  subscription_plan_versions: { hasUserId: false },
  superadmin_settings: { hasUserId: false },
  superadmin_tickets: { hasUserId: false },
  superadmin_payments: { hasUserId: false },
  superadmin_email_logs: { hasUserId: false }
};

export class WorkspaceRepository {
  private tableName: string;
  private user: any;

  constructor(tableName: string, user: any) {
    this.tableName = tableName;
    this.user = user;
  }

  async getAll() {
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    const filters = await this.getAssignmentFilters();
    const useMemoryFilter = filters.isRestricted && 
      (this.tableName === 'candidates' || this.tableName === 'communication_logs') && 
      filters.candidateIds.length > 300;

    while (hasMore) {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('workspace_id', this.user.workspace_id);

      if (filters.isRestricted && !useMemoryFilter) {
        query = this.applyQueryFilters(query, filters);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        let dataToAppend = data;
        if (useMemoryFilter) {
          if (this.tableName === 'candidates') {
            dataToAppend = data.filter((c: any) => filters.candidateIds.includes(c.id) || c.created_by === this.user.id);
          } else if (this.tableName === 'communication_logs') {
            dataToAppend = data.filter((log: any) => filters.candidateIds.includes(log.candidate_id) || log.created_by === this.user.id);
          }
        }
        allData.push(...dataToAppend);
        if (data.length < limit) {
          hasMore = false;
        } else {
          start += limit;
        }
      }
    }
    return keysToCamel(allData);
  }

  async getCustom(selectClause = '*', matchFilters: Record<string, any> = {}) {
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    const filters = await this.getAssignmentFilters();
    const useMemoryFilter = filters.isRestricted && 
      (this.tableName === 'candidates' || this.tableName === 'communication_logs') && 
      filters.candidateIds.length > 300;

    while (hasMore) {
      let query = supabase
        .from(this.tableName)
        .select(selectClause)
        .eq('workspace_id', this.user.workspace_id);

      if (filters.isRestricted && !useMemoryFilter) {
        query = this.applyQueryFilters(query, filters);
      }

      for (const [key, val] of Object.entries(matchFilters)) {
        query = query.eq(key, val);
      }

      const { data, error } = await query
        .range(start, start + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        let dataToAppend = data;
        if (useMemoryFilter) {
          if (this.tableName === 'candidates') {
            dataToAppend = data.filter((c: any) => filters.candidateIds.includes(c.id) || c.created_by === this.user.id);
          } else if (this.tableName === 'communication_logs') {
            dataToAppend = data.filter((log: any) => filters.candidateIds.includes(log.candidate_id) || log.created_by === this.user.id);
          }
        }
        allData.push(...dataToAppend);
        if (data.length < limit) {
          hasMore = false;
        } else {
          start += limit;
        }
      }
    }
    return keysToCamel(allData);
  }

  async create(body: any) {
    const snakeBody = keysToSnake(body);

    if (this.tableName === 'candidates') {
      const email = snakeBody.email?.trim().toLowerCase();
      if (email) {
        const { data: existing, error: checkError } = await supabase
          .from('candidates')
          .select('id, name')
          .eq('workspace_id', this.user.workspace_id)
          .eq('email', email)
          .maybeSingle();

        if (checkError) {
          console.error('[WorkspaceRepository] Error checking existing candidate email:', checkError.message);
        }

        if (existing) {
          throw new Error(`Candidate with email '${email}' already exists in this workspace (Name: ${existing.name}, ID: ${existing.id}).`);
        }
      }
    }

    if (!snakeBody.id) {
      snakeBody.id = crypto.randomUUID();
    }
    snakeBody.workspace_id = this.user.workspace_id;
    // Assignment tables have no created_by/updated_by columns — skip injecting them
    const AUDIT_EXEMPT = ['profiles', 'workspace_roles', 'workspaces', 'job_assignments', 'company_assignments'];
    if (!AUDIT_EXEMPT.includes(this.tableName)) {
      snakeBody.created_by = this.user.id;
      snakeBody.updated_by = this.user.id;
    }
    const config = TABLE_CONFIGS[this.tableName] || {};
    const hasUserIdColumn = config.hasUserId !== false;
    if (!hasUserIdColumn) {
      delete snakeBody.user_id;
    } else if (!config.isAssignmentTable && !snakeBody.user_id) {
      snakeBody.user_id = this.user.id;
    }

    const { data, error } = await supabase.from(this.tableName).insert([snakeBody]).select();
    if (error) throw error;

    await this.logActivity('Create', `Created record in ${this.tableName} (ID: ${data[0].id})`, data[0].id);
    return keysToCamel(data[0]);
  }

  async createBulk(list: any[]) {
    const config = TABLE_CONFIGS[this.tableName] || {};
    const hasUserIdColumn = config.hasUserId !== false;

    const snakeList = list.map(item => {
      const snakeItem = keysToSnake(item);
      if (!snakeItem.id) {
        snakeItem.id = crypto.randomUUID();
      }
      snakeItem.workspace_id = this.user.workspace_id;
      if (this.tableName !== 'profiles' && this.tableName !== 'workspace_roles' && this.tableName !== 'workspaces') {
        snakeItem.created_by = this.user.id;
        snakeItem.updated_by = this.user.id;
      }
      if (!hasUserIdColumn) {
        delete snakeItem.user_id;
      } else if (!config.isAssignmentTable && !snakeItem.user_id) {
        snakeItem.user_id = this.user.id;
      }
      return snakeItem;
    });

    const { data, error } = await supabase.from(this.tableName).upsert(snakeList).select();
    if (error) throw error;

    await this.logActivity('Bulk Create', `Bulk imported ${list.length} records into ${this.tableName}`);
    return keysToCamel(data);
  }

  async update(id: string, body: any) {
    const snakeBody = keysToSnake(body);
    delete snakeBody.id;
    delete snakeBody.created_at;
    delete snakeBody.workspace_id;
    delete snakeBody.created_by;

    const config = TABLE_CONFIGS[this.tableName] || {};
    const hasUserIdColumn = config.hasUserId !== false;
    if (!hasUserIdColumn || !config.isAssignmentTable) {
      delete snakeBody.user_id;
    }

    // Assignment tables have no updated_by/updated_at columns — skip injecting them
    const AUDIT_EXEMPT_UPDATE = ['profiles', 'workspace_roles', 'workspaces', 'job_assignments', 'company_assignments'];
    if (!AUDIT_EXEMPT_UPDATE.includes(this.tableName)) {
      snakeBody.updated_by = this.user.id;
      snakeBody.updated_at = new Date().toISOString();
    }

    // Clean up any transient/temporary UI keys starting with '_' for all tables
    Object.keys(snakeBody).forEach(key => {
      if (key.startsWith('_')) {
        delete snakeBody[key];
      }
    });

    if (this.tableName === 'candidates') {
      const CANDIDATE_COLUMNS = [
        'name', 'phone', 'email', 'experience', 'skills', 'current_company',
        'status', 'ai_match_score', 'resume_text', 'resume_file_name',
        'education', 'address', 'notes', 'applied_date', 'designation',
        'gender', 'city', 'expected_salary', 'import_id', 'custom_fields',
        'notice_period', 'updated_at', 'updated_by'
      ];
      Object.keys(snakeBody).forEach(key => {
        if (!CANDIDATE_COLUMNS.includes(key)) {
          delete snakeBody[key];
        }
      });
    }

    const filters = await this.getAssignmentFilters();
    const useMemoryFilter = filters.isRestricted && 
      (this.tableName === 'candidates' || this.tableName === 'communication_logs') && 
      filters.candidateIds.length > 300;

    if (useMemoryFilter) {
      if (this.tableName === 'candidates') {
        const { data: recordCheck } = await supabase.from('candidates').select('id, created_by').eq('id', id).eq('workspace_id', this.user.workspace_id).maybeSingle();
        if (!recordCheck || (!filters.candidateIds.includes(recordCheck.id) && recordCheck.created_by !== this.user.id)) {
          throw new Error('Record not found or access denied');
        }
      } else if (this.tableName === 'communication_logs') {
        const { data: recordCheck } = await supabase.from('communication_logs').select('id, candidate_id, created_by').eq('id', id).eq('workspace_id', this.user.workspace_id).maybeSingle();
        if (!recordCheck || (!filters.candidateIds.includes(recordCheck.candidate_id) && recordCheck.created_by !== this.user.id)) {
          throw new Error('Record not found or access denied');
        }
      }
    }

    let query = supabase
      .from(this.tableName)
      .update(snakeBody)
      .eq('id', id)
      .eq('workspace_id', this.user.workspace_id);

    if (filters.isRestricted && !useMemoryFilter) {
      query = this.applyQueryFilters(query, filters);
    }

    const { data, error } = await query.select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Record not found or access denied');

    await this.logActivity('Update', `Updated record in ${this.tableName} (ID: ${id})`, id);
    return keysToCamel(data[0]);
  }

  async delete(id: string) {
    const filters = await this.getAssignmentFilters();
    const useMemoryFilter = filters.isRestricted && 
      (this.tableName === 'candidates' || this.tableName === 'communication_logs') && 
      filters.candidateIds.length > 300;

    if (useMemoryFilter) {
      if (this.tableName === 'candidates') {
        const { data: recordCheck } = await supabase.from('candidates').select('id, created_by').eq('id', id).eq('workspace_id', this.user.workspace_id).maybeSingle();
        if (!recordCheck || (!filters.candidateIds.includes(recordCheck.id) && recordCheck.created_by !== this.user.id)) {
          throw new Error('Record not found or access denied');
        }
      } else if (this.tableName === 'communication_logs') {
        const { data: recordCheck } = await supabase.from('communication_logs').select('id, candidate_id, created_by').eq('id', id).eq('workspace_id', this.user.workspace_id).maybeSingle();
        if (!recordCheck || (!filters.candidateIds.includes(recordCheck.candidate_id) && recordCheck.created_by !== this.user.id)) {
          throw new Error('Record not found or access denied');
        }
      }
    }

    let query = supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('workspace_id', this.user.workspace_id);

    if (filters.isRestricted && !useMemoryFilter) {
      query = this.applyQueryFilters(query, filters);
    }

    const { error } = await query;

    if (error) throw error;

    await this.logActivity('Delete', `Deleted record in ${this.tableName} (ID: ${id})`, id);
    return { success: true, id };
  }

  async deleteBulkByImport(importId: string) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('import_id', importId)
      .eq('workspace_id', this.user.workspace_id);

    if (error) throw error;

    await this.logActivity('Bulk Delete', `Rolled back import ${importId} in ${this.tableName}`);
    return { success: true, importId };
  }

  private async logActivity(action: string, description: string, entityId?: string) {
    if (this.tableName === 'activity_logs') return;

    try {
      const log = {
        id: crypto.randomUUID(),
        workspace_id: this.user.workspace_id,
        user_id: this.user.id,
        user_name: this.user.name || this.user.email,
        type: action,
        description,
        timestamp: new Date().toISOString(),
        created_by: this.user.id,
        updated_by: this.user.id
      };
      await supabase.from('activity_logs').insert([log]);
    } catch (err: any) {
      console.error('Failed to log audit activity:', err.message);
    }
  }

  private async getAssignmentFilters(): Promise<{
    isRestricted: boolean;
    companyIds: string[];
    jobIds: string[];
    candidateIds: string[];
  }> {
    const userRole = (this.user.role || '').toLowerCase();
    const strategy = this.user.recruiter_assignment_strategy || 'global';
    
    if (userRole === 'owner' || userRole === 'admin' || strategy === 'global' || this.user.is_super_admin) {
      return { isRestricted: false, companyIds: [], jobIds: [], candidateIds: [] };
    }

    // 1. Fetch direct company assignments
    let assignedCompanyIds: string[] = [];
    if (strategy === 'company' || strategy === 'hybrid') {
      const { data: compAssigns } = await supabase
        .from('company_assignments')
        .select('company_id')
        .eq('user_id', this.user.id)
        .eq('workspace_id', this.user.workspace_id);
      assignedCompanyIds = (compAssigns || []).map(a => a.company_id);
    }

    // 2. Fetch direct job assignments
    let assignedJobIds: string[] = [];
    if (strategy === 'job' || strategy === 'hybrid') {
      const { data: jobAssigns } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', this.user.id)
        .eq('workspace_id', this.user.workspace_id);
      assignedJobIds = (jobAssigns || []).map(a => a.job_id);
    }

    // 3. If company-based, resolve jobs under assigned companies
    if (assignedCompanyIds.length > 0) {
      const { data: companyJobs } = await supabase
        .from('jobs')
        .select('id')
        .in('company_id', assignedCompanyIds)
        .eq('workspace_id', this.user.workspace_id);
      if (companyJobs) {
        const cJobIds = companyJobs.map(j => j.id);
        assignedJobIds = Array.from(new Set([...assignedJobIds, ...cJobIds]));
      }
    }

    // 4. If job-based, resolve companies of assigned jobs
    if (assignedJobIds.length > 0) {
      const { data: jobCompanyIds } = await supabase
        .from('jobs')
        .select('company_id')
        .in('id', assignedJobIds)
        .eq('workspace_id', this.user.workspace_id);
      if (jobCompanyIds) {
        const compIds = jobCompanyIds.map(jc => jc.company_id).filter(Boolean) as string[];
        assignedCompanyIds = Array.from(new Set([...assignedCompanyIds, ...compIds]));
      }
    }

    // 5. Resolve candidate IDs linked to these jobs
    let linkedCandidateIds: string[] = [];
    if (assignedJobIds.length > 0) {
      const { data: jobCandLinks } = await supabase
        .from('job_candidates')
        .select('candidate_id')
        .in('job_id', assignedJobIds)
        .eq('workspace_id', this.user.workspace_id);
      linkedCandidateIds = (jobCandLinks || []).map(jc => jc.candidate_id);
    }

    return {
      isRestricted: true,
      companyIds: assignedCompanyIds,
      jobIds: assignedJobIds,
      candidateIds: linkedCandidateIds
    };
  }

  private applyQueryFilters(query: any, filters: { companyIds: string[]; jobIds: string[]; candidateIds: string[] }): any {
    const companyIds = filters.companyIds.length > 0 ? filters.companyIds : ['00000000-0000-0000-0000-000000000000'];
    const jobIds = filters.jobIds.length > 0 ? filters.jobIds : ['00000000-0000-0000-0000-000000000000'];
    const candidateIds = filters.candidateIds.length > 0 ? filters.candidateIds : ['00000000-0000-0000-0000-000000000000'];

    switch (this.tableName) {
      case 'companies':
        return query.in('id', companyIds);
      case 'jobs':
        return query.in('id', jobIds);
      case 'candidates':
        return query.or(`id.in.(${candidateIds.join(',')}),created_by.eq.${this.user.id}`);
      case 'job_candidates':
        return query.in('job_id', jobIds);
      case 'tasks':
        return query.or(`user_id.eq.${this.user.id},created_by.eq.${this.user.id},candidate_id.in.(${candidateIds.join(',')})`);
      case 'interviews':
        return query.or(`created_by.eq.${this.user.id},user_id.eq.${this.user.id},job_id.in.(${jobIds.join(',')})`);
      case 'job_notes':
        return query.in('job_id', jobIds);
      case 'company_contacts':
      case 'company_documents':
      case 'company_notes':
        return query.in('company_id', companyIds);
      case 'communication_logs':
        return query.or(`candidate_id.in.(${candidateIds.join(',')}),created_by.eq.${this.user.id}`);
      default:
        return query;
    }
  }
}
