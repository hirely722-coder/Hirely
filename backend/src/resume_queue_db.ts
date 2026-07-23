/**
 * resume_queue_db.ts
 * Database store & file-backed persistence repository for the Resume Processing Queue.
 */

import fs from 'fs';
import path from 'path';
import { supabase } from './db';
import { EmailCenterDB } from './email_center_db';
import { ResumeDetectorService } from './services/resume_detector_service';

export interface ResumeQueueItem {
  id: string;
  workspaceId: string;
  emailId?: string;
  threadId?: string;
  attachmentName: string;
  attachmentSize?: number;
  mimeType?: string;
  senderEmail: string;
  senderName?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  designation?: string;
  skills?: string[];
  docType: 'Resume' | 'CV' | 'Cover Letter' | 'Offer Letter' | 'Salary Slip' | 'Invoice' | 'Aadhaar' | 'Passport' | 'Contract' | 'Other';
  confidenceScore: number; // 0 to 100
  confidenceTier: 'High' | 'Medium' | 'Low';
  parseStatus: 'Pending' | 'Parsed' | 'Failed' | 'Ignored';
  duplicateStatus: 'New' | 'Duplicate Found' | 'Possible Duplicate' | 'Updated' | 'Merged';
  existingCandidateId?: string;
  existingCandidateName?: string;
  importStatus: 'Auto Imported' | 'Pending Review' | 'Manually Imported' | 'Ignored';
  failureReason?: string;
  contentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), 'data', 'resume_queue_store.json');
const memoryQueue = new Map<string, ResumeQueueItem[]>();

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
      if (data.queue) {
        Object.keys(data.queue).forEach(ws => memoryQueue.set(ws, data.queue[ws]));
      }
    }
  } catch (err) {
    console.warn('[ResumeQueueDB] Disk load warning:', err);
  }
}

function saveDiskStore() {
  try {
    ensureStoreDir();
    const queueObj: Record<string, any> = {};
    memoryQueue.forEach((val, key) => { queueObj[key] = val; });

    fs.writeFileSync(STORE_PATH, JSON.stringify({
      queue: queueObj,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ResumeQueueDB] Disk save warning:', err);
  }
}

// Load disk store on module initialization
loadDiskStore();

export class ResumeQueueDB {
  static async addQueueItem(item: Omit<ResumeQueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResumeQueueItem> {
    const now = new Date().toISOString();
    const newItem: ResumeQueueItem = {
      ...item,
      id: 'rq_' + Math.random().toString(36).substring(2, 11),
      createdAt: now,
      updatedAt: now,
    };

    // 1. Memory / File store update
    const list = memoryQueue.get(item.workspaceId) || [];
    const existingIdx = list.findIndex(i => 
      i.attachmentName === item.attachmentName && 
      i.senderEmail?.toLowerCase() === item.senderEmail?.toLowerCase()
    );

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...newItem, updatedAt: now };
    } else {
      list.unshift(newItem);
    }
    memoryQueue.set(item.workspaceId, list);
    saveDiskStore();

    // 2. Supabase DB Upsert
    try {
      if (item.workspaceId && item.workspaceId !== 'ws_default') {
        await supabase.from('resume_queue').upsert({
          workspace_id: item.workspaceId,
          email_id: item.emailId,
          thread_id: item.threadId,
          attachment_name: item.attachmentName,
          attachment_size: item.attachmentSize,
          mime_type: item.mimeType,
          sender_email: item.senderEmail,
          sender_name: item.senderName,
          candidate_name: item.candidateName,
          candidate_email: item.candidateEmail,
          candidate_phone: item.candidatePhone,
          doc_type: item.docType || 'Resume',
          confidence_score: item.confidenceScore || 85,
          confidence_tier: item.confidenceTier || 'High',
          parse_status: item.parseStatus || 'Pending',
          duplicate_status: item.duplicateStatus || 'New',
          existing_candidate_id: item.existingCandidateId,
          existing_candidate_name: item.existingCandidateName,
          import_status: item.importStatus || 'Pending Review',
          content_url: item.contentUrl,
          updated_at: now
        }, { onConflict: 'workspace_id,sender_email,attachment_name' });
      }
    } catch (dbErr) {
      console.warn('[ResumeQueueDB] Supabase upsert warning:', dbErr);
    }

    return newItem;
  }

  static async listQueueItems(workspaceId: string): Promise<ResumeQueueItem[]> {
    let list = memoryQueue.get(workspaceId) || [];

    // 1. Fetch Supabase DB items
    try {
      if (workspaceId && workspaceId !== 'ws_default') {
        const { data, error } = await supabase
          .from('resume_queue')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const dbItems: ResumeQueueItem[] = data.map((row: any) => ({
            id: row.id,
            workspaceId: row.workspace_id,
            emailId: row.email_id,
            threadId: row.thread_id,
            attachmentName: row.attachment_name,
            attachmentSize: row.attachment_size,
            mimeType: row.mime_type,
            senderEmail: row.sender_email,
            senderName: row.sender_name,
            candidateName: row.candidate_name,
            candidateEmail: row.candidate_email,
            candidatePhone: row.candidate_phone,
            docType: row.doc_type || 'Resume',
            confidenceScore: row.confidence_score || 85,
            confidenceTier: row.confidence_tier || 'High',
            parseStatus: row.parse_status || 'Pending',
            duplicateStatus: row.duplicate_status || 'New',
            existingCandidateId: row.existing_candidate_id,
            existingCandidateName: row.existing_candidate_name,
            importStatus: row.import_status || 'Pending Review',
            contentUrl: row.content_url,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          memoryQueue.set(workspaceId, dbItems);
          saveDiskStore();
          list = dbItems;
        }
      }
    } catch (dbErr) {
      console.warn('[ResumeQueueDB] Supabase select warning:', dbErr);
    }
    
    // 2. Auto-scan existing email attachments into resume queue if missing
    try {
      const messages = await EmailCenterDB.getAllMessages(workspaceId);
      for (const msg of messages) {
        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            const alreadyInQueue = list.some(i => i.attachmentName === att.filename && i.senderEmail === msg.senderEmail);
            if (!alreadyInQueue) {
              await ResumeDetectorService.processAttachment({
                workspaceId,
                emailId: msg.id,
                threadId: msg.threadId,
                filename: att.filename,
                fileSize: att.fileSize,
                mimeType: att.mimeType,
                bodyText: msg.bodyText,
                senderEmail: msg.senderEmail,
                senderName: msg.senderName,
                contentUrl: att.contentUrl,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ResumeQueueDB] Backfill scan warning:', e);
    }

    const updatedList = memoryQueue.get(workspaceId) || [];
    return [...updatedList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async updateQueueItemStatus(
    workspaceId: string, 
    id: string, 
    status: { importStatus?: ResumeQueueItem['importStatus']; parseStatus?: ResumeQueueItem['parseStatus']; duplicateStatus?: ResumeQueueItem['duplicateStatus'] }
  ): Promise<boolean> {
    const list = memoryQueue.get(workspaceId) || [];
    const item = list.find(i => i.id === id);
    if (item) {
      if (status.importStatus) item.importStatus = status.importStatus;
      if (status.parseStatus) item.parseStatus = status.parseStatus;
      if (status.duplicateStatus) item.duplicateStatus = status.duplicateStatus;
      item.updatedAt = new Date().toISOString();
      memoryQueue.set(workspaceId, list);
      saveDiskStore();

      try {
        if (workspaceId && workspaceId !== 'ws_default') {
          await supabase.from('resume_queue').update({
            import_status: item.importStatus,
            parse_status: item.parseStatus,
            duplicate_status: item.duplicateStatus,
            updated_at: item.updatedAt
          }).eq('workspace_id', workspaceId).eq('id', id);
        }
      } catch (e) {}

      return true;
    }
    return false;
  }

  static async bulkUpdateStatus(
    workspaceId: string, 
    ids: string[], 
    importStatus: ResumeQueueItem['importStatus']
  ): Promise<number> {
    const list = memoryQueue.get(workspaceId) || [];
    let count = 0;
    for (const item of list) {
      if (ids.includes(item.id)) {
        item.importStatus = importStatus;
        item.updatedAt = new Date().toISOString();
        count++;
      }
    }
    memoryQueue.set(workspaceId, list);
    saveDiskStore();

    try {
      if (workspaceId && workspaceId !== 'ws_default') {
        await supabase.from('resume_queue').update({
          import_status: importStatus,
          updated_at: new Date().toISOString()
        }).eq('workspace_id', workspaceId).in('id', ids);
      }
    } catch (e) {}

    return count;
  }

  static async deleteQueueItem(workspaceId: string, id: string): Promise<boolean> {
    const list = memoryQueue.get(workspaceId) || [];
    const filtered = list.filter(i => i.id !== id);
    memoryQueue.set(workspaceId, filtered);
    saveDiskStore();

    try {
      if (workspaceId && workspaceId !== 'ws_default') {
        await supabase.from('resume_queue').delete().eq('workspace_id', workspaceId).eq('id', id);
      }
    } catch (e) {}

    return true;
  }
}
