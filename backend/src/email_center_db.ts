/**
 * email_center_db.ts
 * Database access repository & in-memory fallback store for the Email Communication Center.
 */

import { supabase } from './db';
import fs from 'fs';
import path from 'path';

export interface EmailAccountConfig {
  id: string;
  workspaceId: string;
  userId?: string;
  provider: 'gmail' | 'outlook' | 'zoho' | 'hostinger' | 'godaddy' | 'custom';
  email: string;
  senderName: string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: 'SSL' | 'TLS' | 'None';
  imapHost: string;
  imapPort: number;
  imapEncryption: 'SSL' | 'TLS' | 'None';
  username: string;
  encryptedPassword?: string;
  status: 'Connected' | 'Warning' | 'Error' | 'Disconnected';
  lastSyncedAt?: string;
  lastSyncedUid?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

export interface EmailAttachment {
  id: string;
  emailId: string;
  workspaceId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  contentUrl?: string;
  storagePath?: string;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  workspaceId: string;
  accountId?: string;
  candidateId?: string;
  jobId?: string;
  messageId?: string;
  imapUid?: number;
  inReplyTo?: string;
  senderEmail: string;
  senderName?: string;
  recipients: EmailRecipient[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash';
  isRead: boolean;
  isStarred: boolean;
  aiSummary?: string;
  aiSentiment?: 'Positive' | 'Neutral' | 'Urgent' | 'Negative';
  aiActionItems?: string[];
  suggestedReply?: string;
  attachments?: EmailAttachment[];
  sentAt?: string;
  receivedAt: string;
  createdAt: string;
}

export interface EmailThread {
  id: string;
  workspaceId: string;
  accountId?: string;
  candidateId?: string;
  jobId?: string;
  subject: string;
  snippet?: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash';
  unreadCount: number;
  isStarred: boolean;
  isArchived: boolean;
  lastMessageAt: string;
  messages?: EmailMessage[];
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  workspaceId: string;
  name: string;
  category: 'Interview Invitation' | 'Offer Letter' | 'Follow Up' | 'Rejection' | 'Resume Request' | 'Meeting Invite' | 'General';
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailSyncLog {
  id: string;
  workspaceId: string;
  accountId?: string;
  syncType: 'IMAP_SYNC' | 'SMTP_SEND' | 'TEST_CONNECTION';
  status: 'Success' | 'Failure';
  emailsSynced: number;
  errorMessage?: string;
  createdAt: string;
}

// File-Backed Disk Persistence Store (Preserves emails across server restarts)
const STORE_PATH = path.join(process.cwd(), 'data', 'email_store.json');

const memoryAccounts = new Map<string, EmailAccountConfig[]>();
const memoryThreads = new Map<string, EmailThread[]>();
const memoryMessages = new Map<string, EmailMessage[]>();
const memoryTemplates = new Map<string, EmailTemplate[]>();
const memorySyncLogs = new Map<string, EmailSyncLog[]>();

function ensureStoreDir() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {}
}

function loadDiskStore() {
  try {
    ensureStoreDir();
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data.accounts) {
        Object.keys(data.accounts).forEach(ws => memoryAccounts.set(ws, data.accounts[ws]));
      }
      if (data.threads) {
        Object.keys(data.threads).forEach(ws => memoryThreads.set(ws, data.threads[ws]));
      }
      if (data.messages) {
        Object.keys(data.messages).forEach(ws => memoryMessages.set(ws, data.messages[ws]));
      }
    }
  } catch (err) {
    console.warn('[EmailCenterDB] Disk load warning:', err);
  }
}

function saveDiskStore() {
  try {
    ensureStoreDir();
    const accountsObj: Record<string, any> = {};
    const threadsObj: Record<string, any> = {};
    const messagesObj: Record<string, any> = {};

    memoryAccounts.forEach((val, key) => { accountsObj[key] = val; });
    memoryThreads.forEach((val, key) => { threadsObj[key] = val; });
    memoryMessages.forEach((val, key) => { messagesObj[key] = val; });

    fs.writeFileSync(STORE_PATH, JSON.stringify({
      accounts: accountsObj,
      threads: threadsObj,
      messages: messagesObj,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[EmailCenterDB] Disk save warning:', err);
  }
}

// Initialize persistent disk store
loadDiskStore();

export class EmailCenterDB {
  // ── Accounts ─────────────────────────────────────────────────────────────

  static async upsertAccount(config: Omit<EmailAccountConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailAccountConfig> {
    const now = new Date().toISOString();
    const newConfig: EmailAccountConfig = {
      ...config,
      id: 'ea_' + Math.random().toString(36).substring(2, 11),
      createdAt: now,
      updatedAt: now,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('email_accounts')
          .upsert({
            workspace_id: config.workspaceId,
            user_id: config.userId,
            provider: config.provider,
            email: config.email,
            sender_name: config.senderName,
            smtp_host: config.smtpHost,
            smtp_port: config.smtpPort,
            smtp_encryption: config.smtpEncryption,
            imap_host: config.imapHost,
            imap_port: config.imapPort,
            imap_encryption: config.imapEncryption,
            username: config.username,
            encrypted_password: config.encryptedPassword,
            status: config.status,
            last_synced_at: config.lastSyncedAt,
          }, { onConflict: 'workspace_id,email' })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            workspaceId: data.workspace_id,
            userId: data.user_id,
            provider: data.provider,
            email: data.email,
            senderName: data.sender_name,
            smtpHost: data.smtp_host,
            smtpPort: data.smtp_port,
            smtpEncryption: data.smtp_encryption,
            imapHost: data.imap_host,
            imapPort: data.imap_port,
            imapEncryption: data.imap_encryption,
            username: data.username,
            encryptedPassword: data.encrypted_password,
            status: data.status,
            lastSyncedAt: data.last_synced_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('[EmailCenterDB] Supabase upsertAccount fallback to memory:', err);
      }
    }

    // Memory Fallback
    const list = memoryAccounts.get(config.workspaceId) || [];
    const idx = list.findIndex(a => a.email === config.email);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...newConfig, updatedAt: now };
      memoryAccounts.set(config.workspaceId, list);
      saveDiskStore();
      return list[idx];
    } else {
      list.push(newConfig);
      memoryAccounts.set(config.workspaceId, list);
      saveDiskStore();
      return newConfig;
    }
  }

  static async getAccount(workspaceId: string): Promise<EmailAccountConfig | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('email_configs')
          .select('*')
          .eq('workspace_id', workspaceId)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id || workspaceId,
            workspaceId: data.workspace_id || workspaceId,
            userId: data.user_id,
            provider: (data.provider || 'custom').toLowerCase() as any,
            email: data.username || data.sender_name || 'Connected Mailbox',
            senderName: data.sender_name || data.username || 'Recruiter',
            smtpHost: data.smtp_host || 'smtp.gmail.com',
            smtpPort: Number(data.port) || 587,
            smtpEncryption: data.encryption || 'TLS',
            imapHost: data.imap_host || 'imap.gmail.com',
            imapPort: Number(data.imap_port) || 993,
            imapEncryption: data.imap_encryption || 'SSL',
            username: data.username || '',
            encryptedPassword: data.password || '',
            status: data.is_connected !== false ? 'Connected' : 'Disconnected',
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('[EmailCenterDB] Supabase getAccount email_configs error:', err);
      }
    }

    const list = memoryAccounts.get(workspaceId) || [];
    return list[0] || null;
  }

  // ── Threads & Messages ───────────────────────────────────────────────────

  static async listThreads(
    workspaceId: string,
    folder: string = 'inbox',
    query?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ threads: EmailThread[]; total: number; unreadTotal: number }> {
    let list = memoryThreads.get(workspaceId) || [];
    const msgs = memoryMessages.get(workspaceId) || [];

    // Rebuild threads directly from messages if memoryThreads is empty
    if (list.length === 0 && msgs.length > 0) {
      const threadMap = new Map<string, EmailThread>();
      for (const m of msgs) {
        const cleanSubj = (m.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
        const existing = threadMap.get(cleanSubj);
        if (!existing) {
          threadMap.set(cleanSubj, {
            id: m.threadId,
            workspaceId: m.workspaceId,
            accountId: m.accountId,
            candidateId: m.candidateId,
            jobId: m.jobId,
            subject: m.subject,
            snippet: m.bodyText ? m.bodyText.substring(0, 120) : m.subject,
            folder: m.folder,
            unreadCount: (m.folder === 'inbox' && !m.isRead) ? 1 : 0,
            isStarred: m.isStarred,
            isArchived: false,
            lastMessageAt: m.receivedAt,
            createdAt: m.createdAt,
            updatedAt: m.createdAt,
          });
        } else {
          if (new Date(m.receivedAt).getTime() > new Date(existing.lastMessageAt).getTime()) {
            existing.lastMessageAt = m.receivedAt;
            existing.snippet = m.bodyText ? m.bodyText.substring(0, 120) : m.subject;
          }
        }
      }
      list = Array.from(threadMap.values());
      memoryThreads.set(workspaceId, list);
    }
    
    // Automatic Deduplication by Clean Subject
    const uniqueMap = new Map<string, EmailThread>();
    for (const t of list) {
      const cleanSubject = (t.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
      const existing = uniqueMap.get(cleanSubject);
      if (!existing || new Date(t.lastMessageAt).getTime() > new Date(existing.lastMessageAt).getTime()) {
        uniqueMap.set(cleanSubject, t);
      }
    }
    const deduplicatedList = Array.from(uniqueMap.values());
    memoryThreads.set(workspaceId, deduplicatedList);

    let filtered = deduplicatedList.filter(t => {
      if (folder === 'starred') return t.isStarred;
      return t.folder === folder;
    });

    if (query && query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(t => 
        t.subject.toLowerCase().includes(q) ||
        (t.snippet && t.snippet.toLowerCase().includes(q)) ||
        (t.candidateName && t.candidateName.toLowerCase().includes(q)) ||
        (t.candidateEmail && t.candidateEmail.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const total = filtered.length;
    const unreadTotal = deduplicatedList.filter(t => t.folder === 'inbox').reduce((acc, t) => acc + t.unreadCount, 0);

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return { threads: paginated, total, unreadTotal };
  }

  static async getThreadDetails(workspaceId: string, threadId: string): Promise<EmailThread | null> {
    let threads = memoryThreads.get(workspaceId) || [];
    let thread = threads.find(t => t.id === threadId);

    if (!thread) {
      const msgs = memoryMessages.get(workspaceId) || [];
      const m = msgs.find(msg => msg.threadId === threadId);
      if (m) {
        thread = {
          id: m.threadId,
          workspaceId: m.workspaceId,
          accountId: m.accountId,
          candidateId: m.candidateId,
          jobId: m.jobId,
          subject: m.subject,
          snippet: m.bodyText ? m.bodyText.substring(0, 120) : m.subject,
          folder: m.folder,
          unreadCount: 0,
          isStarred: m.isStarred,
          isArchived: false,
          lastMessageAt: m.receivedAt,
          createdAt: m.createdAt,
          updatedAt: m.createdAt,
        };
      }
    }

    if (!thread) return null;

    const msgs = (memoryMessages.get(workspaceId) || []).filter(m => m.threadId === threadId || (m.subject && thread && m.subject.replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase() === thread.subject.replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase()));
    msgs.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    return {
      ...thread,
      messages: msgs
    };
  }

  static async getAllMessages(workspaceId: string): Promise<EmailMessage[]> {
    return memoryMessages.get(workspaceId) || [];
  }

  static async saveMessage(msgData: Omit<EmailMessage, 'id' | 'createdAt'>): Promise<EmailMessage | null> {
    const workspaceMsgs = memoryMessages.get(msgData.workspaceId) || [];
    
    // Check if message already exists (Deduplication Check)
    const existingMsg = workspaceMsgs.find(m => 
      m.senderEmail?.toLowerCase() === msgData.senderEmail?.toLowerCase() &&
      m.subject === msgData.subject &&
      (m.receivedAt === msgData.receivedAt || m.bodyText === msgData.bodyText)
    );

    if (existingMsg) {
      // Ensure thread exists in memoryThreads
      const workspaceThreads = memoryThreads.get(msgData.workspaceId) || [];
      const cleanSubjKey = (msgData.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
      let thread = workspaceThreads.find(t => 
        t.id === existingMsg.threadId || 
        (t.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase() === cleanSubjKey
      );
      if (!thread) {
        thread = {
          id: existingMsg.threadId,
          workspaceId: msgData.workspaceId,
          accountId: msgData.accountId,
          candidateId: msgData.candidateId,
          jobId: msgData.jobId,
          subject: msgData.subject,
          snippet: existingMsg.bodyText ? existingMsg.bodyText.substring(0, 120) : existingMsg.subject,
          folder: msgData.folder,
          unreadCount: (msgData.folder === 'inbox' && !msgData.isRead) ? 1 : 0,
          isStarred: false,
          isArchived: false,
          lastMessageAt: existingMsg.receivedAt,
          createdAt: existingMsg.createdAt,
          updatedAt: existingMsg.createdAt,
        };
        workspaceThreads.push(thread);
        memoryThreads.set(msgData.workspaceId, workspaceThreads);
      }
      return existingMsg;
    }

    const now = new Date().toISOString();
    const cleanSubjKey = (msgData.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();

    // Check if matching thread exists by subject
    const workspaceThreads = memoryThreads.get(msgData.workspaceId) || [];
    let thread = workspaceThreads.find(t => 
      t.id === msgData.threadId || 
      (t.subject || '').replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase() === cleanSubjKey
    );

    const actualThreadId = thread ? thread.id : msgData.threadId;

    const newMsg: EmailMessage = {
      ...msgData,
      threadId: actualThreadId,
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      createdAt: now,
    };

    // Save message into memory
    workspaceMsgs.push(newMsg);
    memoryMessages.set(msgData.workspaceId, workspaceMsgs);

    if (thread) {
      thread.lastMessageAt = newMsg.receivedAt;
      thread.snippet = newMsg.bodyText ? newMsg.bodyText.substring(0, 120) : newMsg.subject;
      if (newMsg.folder === 'inbox' && !newMsg.isRead) {
        thread.unreadCount += 1;
      }
      thread.updatedAt = now;
    } else {
      thread = {
        id: actualThreadId,
        workspaceId: msgData.workspaceId,
        accountId: msgData.accountId,
        candidateId: msgData.candidateId,
        jobId: msgData.jobId,
        subject: msgData.subject,
        snippet: newMsg.bodyText ? newMsg.bodyText.substring(0, 120) : newMsg.subject,
        folder: msgData.folder,
        unreadCount: (msgData.folder === 'inbox' && !msgData.isRead) ? 1 : 0,
        isStarred: false,
        isArchived: false,
        lastMessageAt: newMsg.receivedAt,
        createdAt: now,
        updatedAt: now,
      };
      workspaceThreads.push(thread);
    }
    memoryThreads.set(msgData.workspaceId, workspaceThreads);
    saveDiskStore();

    return newMsg;
  }

  static async updateThreadFolder(workspaceId: string, threadId: string, folder: EmailThread['folder']): Promise<boolean> {
    const threads = memoryThreads.get(workspaceId) || [];
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      thread.folder = folder;
      thread.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  static async toggleThreadStar(workspaceId: string, threadId: string, isStarred: boolean): Promise<boolean> {
    const threads = memoryThreads.get(workspaceId) || [];
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      thread.isStarred = isStarred;
      thread.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  static async markThreadRead(workspaceId: string, threadId: string): Promise<boolean> {
    const threads = memoryThreads.get(workspaceId) || [];
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      thread.unreadCount = 0;
      const msgs = (memoryMessages.get(workspaceId) || []).filter(m => m.threadId === threadId);
      msgs.forEach(m => { m.isRead = true; });
      return true;
    }
    return false;
  }

  // ── Templates ────────────────────────────────────────────────────────────

  static async listTemplates(workspaceId: string): Promise<EmailTemplate[]> {
    const list = memoryTemplates.get(workspaceId);
    if (list && list.length > 0) return list;

    // Seed default recruitment templates if empty
    const defaults: EmailTemplate[] = [
      {
        id: 'tpl_1',
        workspaceId,
        name: 'Interview Invitation - Technical Round',
        category: 'Interview Invitation',
        subject: 'Interview Invitation: {{job_title}} Position at {{company_name}}',
        bodyHtml: `<p>Hi {{candidate_name}},</p><p>We reviewed your background for the <strong>{{job_title}}</strong> role at {{company_name}} and would love to invite you to a 45-minute technical screening call.</p><p>Please let us know your availability over the next few days.</p><p>Best regards,<br/>{{recruiter_name}}</p>`,
        bodyText: `Hi {{candidate_name}},\n\nWe reviewed your background for the {{job_title}} role at {{company_name}} and would love to invite you to a technical screening call.\n\nPlease let us know your availability.\n\nBest regards,\n{{recruiter_name}}`,
        variables: ['candidate_name', 'job_title', 'company_name', 'recruiter_name'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tpl_2',
        workspaceId,
        name: 'Formal Offer Letter Notification',
        category: 'Offer Letter',
        subject: 'Offer of Employment: {{job_title}} at {{company_name}}',
        bodyHtml: `<p>Dear {{candidate_name}},</p><p>On behalf of <strong>{{company_name}}</strong>, we are thrilled to extend an offer for the position of <strong>{{job_title}}</strong>!</p><p>Please review the details attached and reply with your confirmation.</p><p>Warm regards,<br/>{{recruiter_name}}</p>`,
        bodyText: `Dear {{candidate_name}},\n\nOn behalf of {{company_name}}, we are thrilled to extend an offer for {{job_title}}!\n\nPlease review details attached.\n\nWarm regards,\n{{recruiter_name}}`,
        variables: ['candidate_name', 'job_title', 'company_name', 'recruiter_name'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tpl_3',
        workspaceId,
        name: 'Application Status Follow Up',
        category: 'Follow Up',
        subject: 'Update regarding your application for {{job_title}}',
        bodyHtml: `<p>Hi {{candidate_name}},</p><p>I wanted to give you a quick update on your application for {{job_title}} at {{company_name}}. Our hiring panel is completing final reviews, and we will follow up shortly with next steps.</p><p>Best,<br/>{{recruiter_name}}</p>`,
        bodyText: `Hi {{candidate_name}},\n\nQuick update on your application for {{job_title}} at {{company_name}}. We will follow up shortly.\n\nBest,\n{{recruiter_name}}`,
        variables: ['candidate_name', 'job_title', 'company_name', 'recruiter_name'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    memoryTemplates.set(workspaceId, defaults);
    return defaults;
  }

  static async createTemplate(templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const now = new Date().toISOString();
    const newTpl: EmailTemplate = {
      ...templateData,
      id: 'tpl_' + Math.random().toString(36).substring(2, 11),
      createdAt: now,
      updatedAt: now,
    };
    const list = memoryTemplates.get(templateData.workspaceId) || [];
    list.push(newTpl);
    memoryTemplates.set(templateData.workspaceId, list);
    return newTpl;
  }

  // ── Candidate Communication History ──────────────────────────────────────

  static async getCandidateEmails(workspaceId: string, candidateId: string): Promise<EmailMessage[]> {
    const msgs = memoryMessages.get(workspaceId) || [];
    return msgs.filter(m => m.candidateId === candidateId).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }
}
