/**
 * email_integration_db.ts
 * Dual-mode data layer for Email Integrations.
 *
 * Priority: Supabase → in-memory Map (no hardcoded FS paths).
 * The in-memory fallback keeps data alive for the process lifetime and is
 * automatically used when the DB table doesn't exist yet.
 */

import { supabase } from './db';
import { keysToCamel } from './utils';
import { encryptToken, decryptToken } from './email_integration_security';
import crypto from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailIntegration {
  id: string;
  workspaceId: string;
  provider: 'gmail' | 'outlook';
  email: string;
  displayName?: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiry: string;       // ISO string
  senderName?: string;
  status: 'Connected' | 'Warning' | 'Error' | 'Needs Reconnect';
  connectedBy?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailIntegrationLog {
  id: string;
  workspaceId: string;
  userId?: string;
  userEmail?: string;
  action: 'Connected' | 'Disconnected' | 'Reconnect' | 'Test Email' | 'Token Refresh' | 'Email Sent' | 'Provider Error';
  ipAddress?: string;
  status: 'Success' | 'Failure';
  details?: string;
  createdAt: string;
}

// ── In-Memory Fallback Store ──────────────────────────────────────────────────

// key = `${workspaceId}:${provider}`
const memIntegrations = new Map<string, EmailIntegration>();
// Ordered list of logs (newest first)
const memLogs: EmailIntegrationLog[] = [];
const MAX_MEM_LOGS = 500;

// ── DB Mode Flag ──────────────────────────────────────────────────────────────

let useMemoryFallback = false;

function memKey(workspaceId: string, provider: string) {
  return `${workspaceId}:${provider}`;
}

// ── EmailIntegrationDB ────────────────────────────────────────────────────────

export class EmailIntegrationDB {

  // ── getByWorkspace ──────────────────────────────────────────────────────────
  static async getByWorkspace(
    workspaceId: string,
    provider: 'gmail' | 'outlook'
  ): Promise<EmailIntegration | null> {
    if (useMemoryFallback) {
      return memIntegrations.get(memKey(workspaceId, provider)) ?? null;
    }

    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('provider', provider)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          console.warn('[EmailIntegrationDB] Table not found — switching to in-memory fallback.');
          useMemoryFallback = true;
          return this.getByWorkspace(workspaceId, provider);
        }
        throw error;
      }
      return data ? keysToCamel(data) : null;
    } catch (err: any) {
      console.warn('[EmailIntegrationDB] DB error, falling back to memory:', err.message);
      useMemoryFallback = true;
      return this.getByWorkspace(workspaceId, provider);
    }
  }

  // ── getActiveForWorkspace ───────────────────────────────────────────────────
  static async getActiveForWorkspace(workspaceId: string): Promise<EmailIntegration | null> {
    if (useMemoryFallback) {
      for (const [, v] of memIntegrations) {
        if (v.workspaceId === workspaceId && v.status === 'Connected') return v;
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'Connected')
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) { useMemoryFallback = true; return this.getActiveForWorkspace(workspaceId); }
        throw error;
      }
      return data ? keysToCamel(data) : null;
    } catch (err: any) {
      useMemoryFallback = true;
      return this.getActiveForWorkspace(workspaceId);
    }
  }

  // ── getAllForWorkspace ───────────────────────────────────────────────────────
  static async getAllForWorkspace(workspaceId: string): Promise<EmailIntegration[]> {
    if (useMemoryFallback) {
      const results: EmailIntegration[] = [];
      for (const [, v] of memIntegrations) {
        if (v.workspaceId === workspaceId) results.push(v);
      }
      return results;
    }

    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) {
        if (isTableMissingError(error)) { useMemoryFallback = true; return this.getAllForWorkspace(workspaceId); }
        throw error;
      }
      return data ? keysToCamel(data) : [];
    } catch (err: any) {
      useMemoryFallback = true;
      return this.getAllForWorkspace(workspaceId);
    }
  }

  // ── upsert ──────────────────────────────────────────────────────────────────
  static async upsert(integration: Partial<EmailIntegration>): Promise<EmailIntegration> {
    const { workspaceId, provider } = integration;
    if (!workspaceId) throw new Error('Missing workspaceId');
    if (!provider) throw new Error('Missing provider');

    const now = new Date().toISOString();

    if (useMemoryFallback) {
      const key = memKey(workspaceId, provider);
      const existing = memIntegrations.get(key);
      const record: EmailIntegration = existing
        ? { ...existing, ...integration, updatedAt: now } as EmailIntegration
        : {
            id: crypto.randomUUID(),
            workspaceId,
            provider,
            email: integration.email || '',
            encryptedAccessToken: integration.encryptedAccessToken || '',
            encryptedRefreshToken: integration.encryptedRefreshToken || '',
            tokenExpiry: integration.tokenExpiry || now,
            status: integration.status || 'Connected',
            createdAt: now,
            updatedAt: now,
            ...integration
          };
      memIntegrations.set(key, record);
      return record;
    }

    try {
      const snakePayload: Record<string, any> = {
        workspace_id: workspaceId,
        provider,
        updated_at: now,
      };

      const fieldMap: Record<string, string> = {
        email: 'email',
        displayName: 'display_name',
        encryptedAccessToken: 'encrypted_access_token',
        encryptedRefreshToken: 'encrypted_refresh_token',
        tokenExpiry: 'token_expiry',
        senderName: 'sender_name',
        status: 'status',
        connectedBy: 'connected_by',
        lastUsedAt: 'last_used_at',
      };

      for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if ((integration as any)[jsKey] !== undefined) {
          snakePayload[dbCol] = (integration as any)[jsKey];
        }
      }

      const { data, error } = await supabase
        .from('email_integrations')
        .upsert(snakePayload, { onConflict: 'workspace_id,provider' })
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) { useMemoryFallback = true; return this.upsert(integration); }
        throw error;
      }
      return keysToCamel(data);
    } catch (err: any) {
      useMemoryFallback = true;
      return this.upsert(integration);
    }
  }

  // ── delete ──────────────────────────────────────────────────────────────────
  static async delete(workspaceId: string, provider: 'gmail' | 'outlook'): Promise<void> {
    if (useMemoryFallback) {
      memIntegrations.delete(memKey(workspaceId, provider));
      return;
    }
    try {
      const { error } = await supabase
        .from('email_integrations')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('provider', provider);

      if (error && !isTableMissingError(error)) throw error;
    } catch (err: any) {
      useMemoryFallback = true;
      this.delete(workspaceId, provider);
    }
  }

  // ── log ─────────────────────────────────────────────────────────────────────
  static async log(entry: Omit<EmailIntegrationLog, 'id' | 'createdAt'>): Promise<void> {
    const now = new Date().toISOString();
    const record: EmailIntegrationLog = { id: crypto.randomUUID(), createdAt: now, ...entry };

    if (useMemoryFallback) {
      memLogs.unshift(record);
      if (memLogs.length > MAX_MEM_LOGS) memLogs.splice(MAX_MEM_LOGS);
      return;
    }

    try {
      const { error } = await supabase.from('email_integration_logs').insert([{
        workspace_id: entry.workspaceId,
        user_id: entry.userId,
        user_email: entry.userEmail,
        action: entry.action,
        ip_address: entry.ipAddress,
        status: entry.status,
        details: entry.details,
      }]);

      if (error) {
        if (isTableMissingError(error)) {
          useMemoryFallback = true;
          memLogs.unshift(record);
          return;
        }
        throw error;
      }
    } catch (err: any) {
      // Always store in memory as a safety net
      useMemoryFallback = true;
      memLogs.unshift(record);
    }
  }

  // ── getLogs ─────────────────────────────────────────────────────────────────
  static async getLogs(workspaceId: string, limit = 50): Promise<EmailIntegrationLog[]> {
    if (useMemoryFallback) {
      return memLogs.filter(l => l.workspaceId === workspaceId).slice(0, limit);
    }

    try {
      const { data, error } = await supabase
        .from('email_integration_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (isTableMissingError(error)) { useMemoryFallback = true; return this.getLogs(workspaceId, limit); }
        throw error;
      }
      return data ? keysToCamel(data) : [];
    } catch (err: any) {
      useMemoryFallback = true;
      return this.getLogs(workspaceId, limit);
    }
  }

  // ── isUsingMemoryFallback ────────────────────────────────────────────────────
  static isUsingMemoryFallback(): boolean {
    return useMemoryFallback;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTableMissingError(error: any): boolean {
  const msg = error?.message || '';
  return (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('Could not find') ||
    msg.includes('undefined table')
  );
}
