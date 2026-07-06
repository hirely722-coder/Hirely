import { supabase } from './db';
import { keysToCamel, keysToSnake } from './utils';
import crypto from 'crypto';

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

    while (hasMore) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('workspace_id', this.user.workspace_id)
        .order('created_at', { ascending: false })
        .range(start, start + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
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

    while (hasMore) {
      let query = supabase
        .from(this.tableName)
        .select(selectClause)
        .eq('workspace_id', this.user.workspace_id);

      for (const [key, val] of Object.entries(matchFilters)) {
        query = query.eq(key, val);
      }

      const { data, error } = await query
        .range(start, start + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
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
    if (!snakeBody.id) {
      snakeBody.id = crypto.randomUUID();
    }
    snakeBody.workspace_id = this.user.workspace_id;
    if (this.tableName !== 'profiles' && this.tableName !== 'workspace_roles' && this.tableName !== 'workspaces') {
      snakeBody.created_by = this.user.id;
      snakeBody.updated_by = this.user.id;
    }
    delete snakeBody.user_id;

    const { data, error } = await supabase.from(this.tableName).insert([snakeBody]).select();
    if (error) throw error;

    await this.logActivity('Create', `Created record in ${this.tableName} (ID: ${data[0].id})`, data[0].id);
    return keysToCamel(data[0]);
  }

  async createBulk(list: any[]) {
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
      delete snakeItem.user_id;
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
    delete snakeBody.user_id;

    if (this.tableName !== 'profiles' && this.tableName !== 'workspace_roles' && this.tableName !== 'workspaces') {
      snakeBody.updated_by = this.user.id;
    }
    snakeBody.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(this.tableName)
      .update(snakeBody)
      .eq('id', id)
      .eq('workspace_id', this.user.workspace_id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Record not found or access denied');

    await this.logActivity('Update', `Updated record in ${this.tableName} (ID: ${id})`, id);
    return keysToCamel(data[0]);
  }

  async delete(id: string) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('workspace_id', this.user.workspace_id);

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
}
