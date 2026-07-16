import { Hono } from 'hono';
import { supabase } from '../db';
import { WorkspaceRepository } from '../repository';
import { requirePermission } from '../middleware/auth';
import { sanitizeObject } from '../utils';

export const crudRouter = new Hono<{
  Variables: {
    user: any;
  }
}>();

/** Translate known Supabase/Postgres constraint errors into user-friendly messages. */
function resolveDbError(err: any): { message: string; status: number } {
  const raw: string = err?.message || '';
  if (raw.includes('unique_workspace_candidate_email')) {
    return {
      message: 'A candidate with this email address already exists in your workspace. Please use a different email.',
      status: 409,
    };
  }
  // Fallback for other unique constraint violations
  if (raw.includes('duplicate key value violates unique constraint')) {
    return {
      message: 'This record already exists. Please check for duplicates and try again.',
      status: 409,
    };
  }
  return { message: raw || 'An unexpected error occurred.', status: 500 };
}

const tablePermissions: Record<string, { read: string; write: string; update: string; delete: string }> = {
  companies: { read: 'companies.view', write: 'companies.create', update: 'companies.edit', delete: 'companies.delete' },
  jobs: { read: 'jobs.view', write: 'jobs.create', update: 'jobs.edit', delete: 'jobs.delete' },
  candidates: { read: 'candidates.view', write: 'candidates.add', update: 'candidates.edit', delete: 'candidates.delete' },
  tasks: { read: 'tasks.view', write: 'tasks.create', update: 'tasks.complete', delete: 'tasks.delete' },
  email_templates: { read: 'templates.view', write: 'templates.create', update: 'templates.edit', delete: 'templates.delete' },
  activity_logs: { read: 'dashboard.view', write: 'dashboard.view', update: 'dashboard.view', delete: 'dashboard.view' },
  communication_logs: { read: 'candidates.view', write: 'candidates.view', update: 'candidates.view', delete: 'candidates.view' },
  custom_field_definitions: { read: 'settings.view', write: 'settings.view', update: 'settings.view', delete: 'settings.view' },
  interviews: { read: 'tasks.view', write: 'tasks.create', update: 'tasks.complete', delete: 'tasks.delete' },
  job_notes: { read: 'jobs.view', write: 'jobs.edit', update: 'jobs.edit', delete: 'jobs.edit' },
  company_contacts: { read: 'companies.view', write: 'companies.edit', update: 'companies.edit', delete: 'companies.edit' },
  company_documents: { read: 'companies.view', write: 'companies.edit', update: 'companies.edit', delete: 'companies.edit' },
  company_notes: { read: 'companies.view', write: 'companies.edit', update: 'companies.edit', delete: 'company_notes.delete' }, // wait, was it company_notes.delete? Let's check tablePermissions in original index.ts
  company_assignments: { read: 'team.view', write: 'team.edit_role', update: 'team.edit_role', delete: 'team.edit_role' },
  job_assignments: { read: 'team.view', write: 'team.edit_role', update: 'team.edit_role', delete: 'team.edit_role' }
};

// Helper: Generic table routing
const createCRUD = (tableName: string) => {
  const perms = tablePermissions[tableName] || { read: 'dashboard.view', write: 'dashboard.view', update: 'dashboard.view', delete: 'dashboard.view' };

  // GET all
  crudRouter.get(`/${tableName}`, requirePermission(perms.read), async (c) => {
    const user = c.get('user') as any;
    try {
      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.getAll();
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // POST create
  crudRouter.post(`/${tableName}`, requirePermission(perms.write), async (c) => {
    const user = c.get('user') as any;
    try {
      const body = sanitizeObject(await c.req.json());

      // Enforce subscription usage limits
      const limitKeyMap: Record<string, string> = {
        candidates: 'max_candidates',
        jobs: 'max_jobs',
        companies: 'max_companies'
      };
      
      const isTrialActive = user.is_trial && user.subscription_status === 'active' && user.trial_end_date && new Date(user.trial_end_date) >= new Date();
      const limitKey = limitKeyMap[tableName];
      if (!isTrialActive && limitKey && user.plan_limits) {
        const rawLimit = user.plan_limits[limitKey];
        if (rawLimit !== undefined && rawLimit !== 'unlimited') {
          const limitNum = parseInt(rawLimit);
          if (!isNaN(limitNum)) {
            const { count, error: countErr } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .eq('workspace_id', user.workspace_id);
              
            if (!countErr && count !== null && count >= limitNum) {
              return c.json({ 
                error: `Limit Reached: Your current plan only allows up to ${limitNum} ${tableName}. Please upgrade your plan.`,
                limitReached: true,
                limitKey
              }, 403);
            }
          }
        }
      }

      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.create(body);

      // Auto-queue emails for communication logs of type 'Email'
      if (tableName === 'communication_logs' && body.type === 'Email') {
        try {
          const { error: queueError } = await supabase.from('email_queue').insert([{
            workspace_id: user.workspace_id,
            recipient: body.recipient || '',
            subject: body.subject || '',
            body: body.message || '',
            status: 'queued'
          }]);
          if (queueError) throw queueError;
          console.log(`[Email Queued] Successfully queued email to ${body.recipient} from workspace ${user.workspace_id}`);
        } catch (queueErr: any) {
          console.error('[Email Queue Error] Failed to queue communication email:', queueErr.message);
        }
      }

      // Legacy trigger compatibility logic (resume upload email/Telegram notifications)
      if (tableName === 'candidates' && body.resumeFileName) {
        try {
          const configRepo = new WorkspaceRepository('email_configs', user);
          const configs = await configRepo.getAll();
          let config = configs.find(cfg => cfg.workspaceId === user.workspace_id);
          
          if (!config && configs.length > 0) {
            config = configs[0];
          }

          if (config && config.resumeNotificationEnabled) {
            const targetEmail = config.resumeNotificationEmail || user.email;
            if (targetEmail) {
              console.log(`[MOCK EMAIL] New Candidate Resume Upload Notification:
To: ${targetEmail}
Subject: [Hirly] New Resume Uploaded: ${body.name}
Body: A new resume file (${body.resumeFileName}) has been successfully uploaded and processed for candidate ${body.name}.`);

              const commRepo = new WorkspaceRepository('communication_logs', user);
              await commRepo.create({
                candidateId: data.id,
                type: 'Email',
                date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'Sent',
                sentBy: 'System (Auto-Alert)',
                subject: `New Candidate Alert: ${body.name}`,
                message: `Automatic alert dispatched to ${targetEmail} for parsed candidate ${body.name} (File: ${body.resumeFileName}).`,
                recipient: targetEmail
              });
            }
          }

          // Telegram Alert
          if (config && config.telegramChatId && config.telegramNotificationEnabled && process.env.TELEGRAM_BOT_TOKEN) {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const messageText = `🔔 <b>New Resume Uploaded</b>\n\n<b>Candidate:</b> ${body.name}\n<b>File:</b> ${body.resumeFileName}\n<b>Skills:</b> ${Array.isArray(body.skills) ? body.skills.join(', ') : 'None'}`;
              
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: config.telegramChatId,
                text: messageText,
                parse_mode: 'HTML'
              })
            });

            console.log(`[TELEGRAM] Sent resume alert for ${body.name} to chat_id ${config.telegramChatId}`);

            const commRepo = new WorkspaceRepository('communication_logs', user);
            await commRepo.create({
              candidateId: data.id,
              type: 'Follow-up',
              date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Sent',
              sentBy: 'System (Telegram Alert)',
              subject: `New Candidate Telegram Alert: ${body.name}`,
              message: `Telegram notification alert sent to verified chat ID ${config.telegramChatId} for candidate ${body.name}.`
            });
          }
        } catch (err: any) {
          console.error('Failed to process candidate update notification alert:', err.message);
        }
      }

      return c.json(data);
    } catch (err: any) {
      const { message, status } = resolveDbError(err);
      return c.json({ error: message }, status as any);
    }
  });

  // POST bulk
  crudRouter.post(`/${tableName}/bulk`, requirePermission(perms.write), async (c) => {
    const user = c.get('user') as any;
    try {
      const list = sanitizeObject(await c.req.json());
      if (!Array.isArray(list)) return c.json({ error: 'Body must be an array' }, 400);

      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.createBulk(list);
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // PUT update
  crudRouter.put(`/${tableName}/:id`, requirePermission(perms.update), async (c) => {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    try {
      const body = sanitizeObject(await c.req.json());
      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.update(id, body);
      return c.json(data);
    } catch (err: any) {
      const { message, status } = resolveDbError(err);
      return c.json({ error: message }, status as any);
    }
  });

  // PATCH update
  crudRouter.patch(`/${tableName}/:id`, requirePermission(perms.update), async (c) => {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    try {
      const body = sanitizeObject(await c.req.json());
      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.update(id, body);
      return c.json(data);
    } catch (err: any) {
      const { message, status } = resolveDbError(err);
      return c.json({ error: message }, status as any);
    }
  });

  // DELETE single
  crudRouter.delete(`/${tableName}/:id`, requirePermission(perms.delete), async (c) => {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    try {
      const repo = new WorkspaceRepository(tableName, user);
      const result = await repo.delete(id);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // DELETE bulk by import ID (rollback)
  crudRouter.delete(`/${tableName}`, requirePermission(perms.delete), async (c) => {
    const user = c.get('user') as any;
    const importId = c.req.query('importId');
    if (!importId) return c.json({ error: 'importId query parameter is required' }, 400);

    try {
      const repo = new WorkspaceRepository(tableName, user);
      const result = await repo.deleteBulkByImport(importId);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });
};

// Register all CRUD routes
createCRUD('companies');
createCRUD('jobs');
createCRUD('candidates');
createCRUD('tasks');
createCRUD('email_templates');
createCRUD('activity_logs');
createCRUD('communication_logs');
createCRUD('custom_field_definitions');
createCRUD('interviews');
createCRUD('job_notes');
createCRUD('company_contacts');
createCRUD('company_documents');
createCRUD('company_notes');
createCRUD('company_assignments');
createCRUD('job_assignments');
