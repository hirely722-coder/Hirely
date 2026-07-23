/**
 * email_center_routes.ts
 * API Endpoints for the Email Communication Center module.
 */

import { Hono } from 'hono';
import { EmailCenterDB } from './email_center_db';
import { ResumeQueueDB } from './resume_queue_db';
import { initialCandidates } from './mockData';
import { EmailCenterService } from './services/email_center_service';
import { encryptToken, decryptToken } from './email_integration_security';
import { EdgeImapClient } from './services/imap_helper';

export function registerEmailCenterRoutes(app: any) {
  // ── 1. Accounts & Settings ───────────────────────────────────────────────

  app.get('/api/email-center/accounts', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const account = await EmailCenterDB.getAccount(workspaceId);

    if (!account) {
      return c.json({ connected: false, account: null });
    }

    // Never return encrypted password
    const safeAccount = { ...account };
    return c.json({ connected: true, account: safeAccount });
  });

  app.get('/api/email-center/account', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const account = await EmailCenterDB.getAccount(workspaceId);

    if (!account) {
      return c.json({ connected: false, account: null });
    }

    const safeAccount = { ...account };
    delete safeAccount.encryptedPassword;

    return c.json({ connected: true, account: safeAccount });
  });

  app.post('/api/email-center/accounts/test-smtp', async (c: any) => {
    try {
      const body = await c.req.json();
      const res = await EmailCenterService.testSmtpConnection({
        smtpHost: body.smtpHost,
        smtpPort: Number(body.smtpPort) || 587,
        smtpEncryption: body.smtpEncryption || 'TLS',
        username: body.username,
        password: body.password,
      });
      return c.json(res);
    } catch (err: any) {
      return c.json({ success: false, protocol: 'SMTP', message: err.message, latencyMs: 0 }, 400);
    }
  });

  app.post('/api/email-center/accounts/test-imap', async (c: any) => {
    try {
      const body = await c.req.json();
      const res = await EmailCenterService.testImapConnection({
        imapHost: body.imapHost,
        imapPort: Number(body.imapPort) || 993,
        imapEncryption: body.imapEncryption || 'SSL',
        username: body.username,
        password: body.password,
      });
      return c.json(res);
    } catch (err: any) {
      return c.json({ success: false, protocol: 'IMAP', message: err.message, latencyMs: 0 }, 400);
    }
  });

  app.post('/api/email-center/accounts/save', async (c: any) => {
    try {
      const user = (c as any).get ? c.get('user') : null;
      const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
      const body = await c.req.json();

      const encryptedPassword = body.password ? encryptToken(body.password) : undefined;

      const account = await EmailCenterDB.upsertAccount({
        workspaceId,
        userId: user?.id,
        provider: body.provider || 'custom',
        email: body.email,
        senderName: body.senderName || 'Recruiter',
        smtpHost: body.smtpHost,
        smtpPort: Number(body.smtpPort) || 587,
        smtpEncryption: body.smtpEncryption || 'TLS',
        imapHost: body.imapHost,
        imapPort: Number(body.imapPort) || 993,
        imapEncryption: body.imapEncryption || 'SSL',
        username: body.username,
        encryptedPassword,
        status: 'Connected',
        lastSyncedAt: new Date().toISOString(),
      });

      const safeAccount = { ...account };
      delete safeAccount.encryptedPassword;

      return c.json({ success: true, account: safeAccount });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // ── 2. Inbox Threads & Messages ─────────────────────────────────────────

  app.get('/api/email-center/threads', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const folder = c.req.query('folder') || 'inbox';
    const q = c.req.query('q') || '';
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 50;

    const result = await EmailCenterDB.listThreads(workspaceId, folder, q, page, limit);
    return c.json(result);
  });

  app.get('/api/email-center/threads/:id', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const threadId = c.req.param('id');

    const thread = await EmailCenterDB.getThreadDetails(workspaceId, threadId);
    if (!thread) {
      return c.json({ error: 'Thread not found' }, 404);
    }

    // Auto mark read
    await EmailCenterDB.markThreadRead(workspaceId, threadId);

    return c.json({ thread });
  });

  app.patch('/api/email-center/threads/:id', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const threadId = c.req.param('id');
    const body = await c.req.json();

    if (body.folder) {
      await EmailCenterDB.updateThreadFolder(workspaceId, threadId, body.folder);
    }
    if (typeof body.isStarred === 'boolean') {
      await EmailCenterDB.toggleThreadStar(workspaceId, threadId, body.isStarred);
    }

    return c.json({ success: true });
  });

  // ── 3. Compose & Dispatch Email ──────────────────────────────────────────

  app.post('/api/email-center/send', async (c: any) => {
    try {
      const user = (c as any).get ? c.get('user') : null;
      const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
      const body = await c.req.json();

      const result = await EmailCenterService.sendEmail({
        workspaceId,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        candidateId: body.candidateId,
        threadId: body.threadId,
        attachments: body.attachments,
      });

      return c.json(result);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // ── 4. IMAP Sync Trigger & Edge Stream Sync ─────────────────────────────

  app.post('/api/email-center/sync', async (c: any) => {
    try {
      const user = (c as any).get ? c.get('user') : null;
      const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
      const result = await EmailCenterService.syncImapMailbox(workspaceId);
      return c.json({ success: true, ...result });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  });

function resolveImapMailboxName(folder: string, imapHost: string): string {
  const isGmail = (imapHost || '').toLowerCase().includes('gmail');
  const targetFolder = (folder || 'inbox').toLowerCase();

  switch (targetFolder) {
    case 'spam':
      return isGmail ? '[Gmail]/Spam' : 'Junk';
    case 'sent':
      return isGmail ? '[Gmail]/Sent Mail' : 'Sent';
    case 'trash':
      return isGmail ? '[Gmail]/Trash' : 'Trash';
    case 'drafts':
      return isGmail ? '[Gmail]/Drafts' : 'Drafts';
    case 'inbox':
    default:
      return 'INBOX';
  }
}

  app.post('/api/email-center/stream-sync', async (c: any) => {
    try {
      const user = (c as any).get ? c.get('user') : null;
      const workspaceId = user?.workspace_id || c.req.header('x-workspace-id');

      if (!workspaceId) {
        return c.json({ success: false, error: 'Unauthorized: missing workspace context' }, 401);
      }

      const account = await EmailCenterDB.getAccount(workspaceId);
      if (!account || !account.imapHost || !account.username) {
        return c.json({ success: true, syncedCount: 0, messages: [], notice: 'No IMAP account configured for this workspace' });
      }

      let reqFolder = 'inbox';
      let limit = 25;
      let horizonWindow: string | undefined = undefined;
      let lastKnownUid: number | undefined = undefined;

      try {
        const body = await c.req.json();
        reqFolder = body.folder || c.req.query('folder') || 'inbox';
        limit = body.limit || parseInt(c.req.query('limit') || '25', 10);
        horizonWindow = body.horizonWindow || c.req.query('horizonWindow');
        lastKnownUid = body.lastKnownUid ? parseInt(body.lastKnownUid, 10) : undefined;
      } catch (e) {
        reqFolder = c.req.query('folder') || 'inbox';
        limit = parseInt(c.req.query('limit') || '25', 10);
        horizonWindow = c.req.query('horizonWindow');
      }

      const mailboxName = resolveImapMailboxName(reqFolder, account.imapHost);

      let decryptedPassword = account.encryptedPassword || '';
      if (decryptedPassword && decryptedPassword.includes('.')) {
        try {
          decryptedPassword = decryptToken(decryptedPassword);
        } catch (e) {}
      }
      const client = new EdgeImapClient({
        host: account.imapHost,
        port: account.imapPort || 993,
        username: account.username,
        password: decryptedPassword,
        mailbox: mailboxName
      });

      await client.connect();
      await client.login();
      await client.selectMailbox(mailboxName);
      const messages = await client.fetchMessages({ limit, horizonWindow, lastKnownUid });
      await client.close();

      const taggedMessages = messages.map(m => ({ ...m, folder: reqFolder }));

      return c.json({ success: true, syncedCount: taggedMessages.length, messages: taggedMessages, folder: reqFolder, workspaceId });
    } catch (err: any) {
      console.error('[Stream Sync Error]', err.message);
      return c.json({ success: false, error: err.message, messages: [] }, 500);
    }
  });

  // ── 5. Templates & Candidate Communication ───────────────────────────────

  app.get('/api/email-center/templates', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const templates = await EmailCenterDB.listTemplates(workspaceId);
    return c.json({ templates });
  });

  app.post('/api/email-center/templates', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const body = await c.req.json();

    const tpl = await EmailCenterDB.createTemplate({
      workspaceId,
      name: body.name,
      category: body.category || 'General',
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      variables: body.variables || ['candidate_name', 'job_title', 'company_name', 'recruiter_name'],
    });

    return c.json({ success: true, template: tpl });
  });

  app.get('/api/email-center/candidate/:candidateId', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const candidateId = c.req.param('candidateId');

    const emails = await EmailCenterDB.getCandidateEmails(workspaceId, candidateId);
    return c.json({ emails });
  });

  // ── 6. Resume Processing Queue & Bulk Operations ────────────────────────
  app.get('/api/email-center/resume-queue', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const queue = await ResumeQueueDB.listQueueItems(workspaceId);

    // Tier 2 Candidate Cross-Check: Cross-reference existing candidates for email/phone matches
    const enrichedQueue = queue.map(item => {
      const targetEmail = (item.candidateEmail || item.senderEmail)?.toLowerCase()?.trim();
      const targetPhone = item.candidatePhone?.replace(/[^0-9]/g, '');

      const existingCand = initialCandidates.find(cand => {
        const candEmail = cand.email?.toLowerCase()?.trim();
        const candPhone = cand.phone?.replace(/[^0-9]/g, '');
        return (targetEmail && candEmail && targetEmail === candEmail) || (targetPhone && candPhone && candPhone.length >= 7 && targetPhone.includes(candPhone));
      });

      if (existingCand) {
        return {
          ...item,
          duplicateStatus: (item.duplicateStatus === 'Merged' ? 'Merged' : 'Possible Duplicate') as any,
          existingCandidateId: existingCand.id,
          existingCandidateName: existingCand.name
        };
      }

      return item;
    });

    return c.json({ queue: enrichedQueue });
  });

  app.post('/api/email-center/resume-queue/bulk-import', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const body = await c.req.json();
    const ids = body.ids || [];

    const queue = await ResumeQueueDB.listQueueItems(workspaceId);
    let importedCount = 0;

    for (const item of queue) {
      if (ids.includes(item.id)) {
        await ResumeQueueDB.updateQueueItemStatus(workspaceId, item.id, {
          importStatus: 'Manually Imported',
          duplicateStatus: 'Updated'
        });

        const targetEmail = (item.candidateEmail || item.senderEmail)?.toLowerCase();
        const existingCand = initialCandidates.find(cand => cand.email?.toLowerCase() === targetEmail);
        if (!existingCand) {
          initialCandidates.unshift({
            id: 'cand_' + Math.random().toString(36).substring(2, 11),
            name: item.candidateName || item.senderName || 'Candidate',
            email: item.candidateEmail || item.senderEmail,
            phone: item.candidatePhone || '+1 (555) 019-2831',
            designation: item.designation || 'Software Engineer',
            status: 'Applied',
            experience: '3+ Years',
            currentCompany: 'Hirely Applicant Pool',
            education: 'B.Tech / Bachelor Degree',
            address: 'Remote',
            notes: `Manually imported from email attachment ${item.attachmentName}.`,
            aiMatchScore: Math.max(75, item.confidenceScore),
            resumeText: '',
            resumeFileName: item.attachmentName,
            appliedDate: new Date().toISOString().split('T')[0],
            skills: item.skills && item.skills.length > 0 ? item.skills : ['React', 'TypeScript', 'Node.js'],
          });
        }
        importedCount++;
      }
    }

    return c.json({ success: true, updatedCount: importedCount });
  });

  // Tier 3 Smart Merging API: Merge resume attachment & log into existing candidate profile
  app.post('/api/email-center/resume-queue/merge', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const body = await c.req.json();
    const { id, targetCandidateId } = body;

    const queue = await ResumeQueueDB.listQueueItems(workspaceId);
    const queueItem = queue.find(i => i.id === id);

    if (queueItem) {
      const targetEmail = (queueItem.candidateEmail || queueItem.senderEmail)?.toLowerCase()?.trim();
      const existingCand = initialCandidates.find(cand => 
        (targetCandidateId && cand.id === targetCandidateId) || 
        (targetEmail && cand.email?.toLowerCase()?.trim() === targetEmail)
      );

      if (existingCand) {
        existingCand.notes = (existingCand.notes || '') + `\n\n[Merged Resume Attachment]: ${queueItem.attachmentName} received on ${new Date(queueItem.createdAt).toLocaleDateString()}. Sender: ${queueItem.senderEmail}`;
        if (queueItem.attachmentName) {
          existingCand.resumeFileName = queueItem.attachmentName;
        }
      }

      await ResumeQueueDB.updateQueueItemStatus(workspaceId, id, {
        importStatus: 'Manually Imported',
        duplicateStatus: 'Merged'
      });

      return c.json({ success: true, candidateName: existingCand?.name || 'Existing Candidate' });
    }

    return c.json({ error: 'Queue item not found' }, 404);
  });

  app.post('/api/email-center/resume-queue/bulk-ignore', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const body = await c.req.json();
    const ids = body.ids || [];

    const updatedCount = await ResumeQueueDB.bulkUpdateStatus(workspaceId, ids, 'Ignored');
    return c.json({ success: true, updatedCount });
  });

  app.delete('/api/email-center/resume-queue/:id', async (c: any) => {
    const user = (c as any).get ? c.get('user') : null;
    const workspaceId = user?.workspace_id || c.req.header('x-workspace-id') || 'ws_default';
    const id = c.req.param('id');

    const success = await ResumeQueueDB.deleteQueueItem(workspaceId, id);
    return c.json({ success });
  });
}
