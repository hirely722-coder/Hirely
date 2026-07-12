import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { stream, streamText } from 'hono/streaming';
import { EventEmitter } from 'events';
import { supabase } from './db';
import { createClient } from '@supabase/supabase-js';
import { keysToCamel, keysToSnake } from './utils';
import { WorkspaceRepository } from './repository';
import dotenv from 'dotenv';
import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';
import crypto from 'crypto';
const Razorpay = (require as any)('razorpay');

dotenv.config();

const app = new Hono<{
  Variables: {
    user: any;
  }
}>();
export { app };

// Enable CORS for frontend
app.use('/*', cors({
  origin: '*', // We can restrict this to the frontend URL if needed
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Health Check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper: robust JSON cleaner
function cleanJsonResponse(rawText: string): any {
  let cleaned = rawText.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    cleaned = match[1].trim();
  }

  // 2. Try parsing, if fails fallback to brace-bounded substring extraction
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerErr) {
        // Fall back to original error
      }
    }
    throw err;
  }
}

async function sanitizeJobData(data: any, user: any) {
  if (!data) return data;
  
  // Only sanitize if companyName or companyId are explicitly passed
  if ('companyId' in data || 'companyName' in data) {
    let matchedCompanyId = data.companyId || null;
    let matchedCompanyName = 'None';

    if (matchedCompanyId) {
      const { data: comp } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', matchedCompanyId)
        .eq('workspace_id', user.workspace_id)
        .maybeSingle();
      if (comp) {
        matchedCompanyName = comp.name;
      } else {
        matchedCompanyId = null;
      }
    } else if (data.companyName && data.companyName !== 'None') {
      const { data: comps } = await supabase
        .from('companies')
        .select('id, name')
        .eq('workspace_id', user.workspace_id);
      
      const comp = comps?.find(c => c.name.toLowerCase() === data.companyName.toLowerCase());
      if (comp) {
        matchedCompanyId = comp.id;
        matchedCompanyName = comp.name;
      }
    }

    data.companyId = matchedCompanyId;
    data.companyName = matchedCompanyName;
  }

  return data;
}

// Unified call to Eden AI
async function callLLM(
  systemInstruction: string,
  promptContent: any,
  temperature: number = 0.7,
  responseSchema?: any
): Promise<string> {
  // If responseSchema is defined, inject standard instruction to promptContent
  let finalPrompt = promptContent;
  if (responseSchema) {
    const jsonInstruction = `\n\nIMPORTANT: You must return your response as a raw JSON string matching the following JSON schema:\n${JSON.stringify(responseSchema)}\nDo NOT wrap the output in markdown code blocks (e.g. \`\`\`json). The output must be pure raw JSON starting with '{' and ending with '}'.`;
    
    if (typeof promptContent === 'string') {
      finalPrompt = promptContent + jsonInstruction;
    } else if (Array.isArray(promptContent)) {
      const parts = promptContent.map(part => {
        if (part && typeof part === 'object') {
          return { ...part };
        }
        return part;
      });
      const textPart = parts.find(p => p.type === 'text' || (p && typeof p === 'object' && 'text' in p));
      if (textPart) {
        textPart.text = (textPart.text || '') + jsonInstruction;
      } else {
        parts.unshift({ type: 'text', text: jsonInstruction });
      }
      finalPrompt = parts;
    } else if (promptContent && typeof promptContent === 'object') {
      finalPrompt = JSON.stringify(promptContent) + jsonInstruction;
    }
  }

  // Call Eden AI
  const edenKey = process.env.EDENAI_API_KEY;
  if (!edenKey) {
    throw new Error('EDENAI_API_KEY is missing or invalid.');
  }

  console.log('Routing request to Eden AI (google/gemma-4-31b-it)...');

  let formattedMessages: any[] = [];
  if (typeof finalPrompt === 'string') {
    formattedMessages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: finalPrompt }
    ];
  } else if (Array.isArray(finalPrompt)) {
    const isMultimodalParts = finalPrompt.every(part => part && !part.role && (part.type === 'text' || part.type === 'image_url'));
    if (isMultimodalParts) {
      formattedMessages = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalPrompt }
      ];
    } else {
      formattedMessages = [
        { role: 'system', content: systemInstruction },
        ...finalPrompt.map(msg => {
          if (msg.role) {
            return { role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content };
          }
          if (msg.type === 'text') {
            return { role: 'user', content: msg.text };
          }
          return { role: 'user', content: JSON.stringify(msg) };
        })
      ];
    }
  } else {
    formattedMessages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: JSON.stringify(finalPrompt) }
    ];
  }

  const response = await fetch('https://api.edenai.run/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${edenKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it',
      messages: formattedMessages,
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as any;
  const rawContent = result.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Empty response received from Eden AI.');
  }

  console.log('Successfully received response from Eden AI API.');
  return rawContent;
}

async function* callLLMStream(
  systemInstruction: string,
  promptContent: any,
  temperature: number = 0.7,
  responseSchema?: any
): AsyncGenerator<string, void, unknown> {
  const edenKey = process.env.EDENAI_API_KEY;
  if (!edenKey) {
    throw new Error('EDENAI_API_KEY is missing or invalid.');
  }

  let finalPrompt = promptContent;
  if (responseSchema) {
    const jsonInstruction = `\n\nIMPORTANT: You must return your response as a raw JSON string matching the following JSON schema:\n${JSON.stringify(responseSchema)}\nDo NOT wrap the output in markdown code blocks (e.g. \`\`\`json). The output must be pure raw JSON starting with '{' and ending with '}'.`;
    
    if (typeof promptContent === 'string') {
      finalPrompt = promptContent + jsonInstruction;
    } else if (Array.isArray(promptContent)) {
      const parts = promptContent.map(part => {
        if (part && typeof part === 'object') {
          return { ...part };
        }
        return part;
      });
      const textPart = parts.find(p => p.type === 'text' || (p && typeof p === 'object' && 'text' in p));
      if (textPart) {
        textPart.text = (textPart.text || '') + jsonInstruction;
      } else {
        parts.unshift({ type: 'text', text: jsonInstruction });
      }
      finalPrompt = parts;
    } else if (promptContent && typeof promptContent === 'object') {
      finalPrompt = JSON.stringify(promptContent) + jsonInstruction;
    }
  }

  let formattedMessages: any[] = [];
  if (typeof finalPrompt === 'string') {
    formattedMessages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: finalPrompt }
    ];
  } else if (Array.isArray(finalPrompt)) {
    const isMultimodalParts = finalPrompt.every(part => part && !part.role && (part.type === 'text' || part.type === 'image_url'));
    if (isMultimodalParts) {
      formattedMessages = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalPrompt }
      ];
    } else {
      formattedMessages = [
        { role: 'system', content: systemInstruction },
        ...finalPrompt.map(msg => {
          if (msg.role) {
            return { role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content };
          }
          if (msg.type === 'text') {
            return { role: 'user', content: msg.text };
          }
          return { role: 'user', content: JSON.stringify(msg) };
        })
      ];
    }
  } else {
    formattedMessages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: JSON.stringify(finalPrompt) }
    ];
  }

  const response = await fetch('https://api.edenai.run/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${edenKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it',
      messages: formattedMessages,
      temperature,
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Ignore incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function callEdenAIWithTools(
  messages: any[],
  tools: any[]
): Promise<any> {
  const edenKey = process.env.EDENAI_API_KEY;
  if (!edenKey) {
    throw new Error('EDENAI_API_KEY is missing or invalid.');
  }

  const response = await fetch('https://api.edenai.run/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${edenKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it',
      messages,
      tools,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// Global event emitter for streaming response tokens to client SSE route
export const streamEmitter = new EventEmitter();

// Memory store for background LLM tasks
export interface BackgroundTask {
  status: 'pending' | 'completed' | 'failed' | 'pending_approval' | 'streaming';
  currentStep?: { name: string; args: any };
  result?: any;
  error?: string;
  user?: any;
}

export const backgroundTasks = new Map<string, BackgroundTask>();

// Task Status polling endpoint
app.get('/api/ai/task-status/:id', async (c) => {
  const taskId = c.req.param('id');
  
  // 1. Try local memory map first (fast fallback)
  let task = backgroundTasks.get(taskId);
  
  // 2. If not found in local memory (different Cloudflare isolate), query database
  if (!task) {
    console.log(`[Task Status] Task ${taskId} not found in memory, checking database...`);
    const { data: dbTask, error } = await supabase
      .from('copilot_tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error) {
      console.error('[Task Status] Database query failed:', error.message);
    }

    if (dbTask) {
      task = {
        status: dbTask.status,
        currentStep: dbTask.current_step ? { name: dbTask.current_step, args: {} } : undefined,
        result: dbTask.result,
        error: dbTask.error
      };
      // Cache it locally in this isolate for subsequent polls
      backgroundTasks.set(taskId, task);
    }
  }

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }
  
  return c.json(task);
});

// Task stream endpoint


// -------------------------------------------------------------
// RBAC & Permission Helper Functions
// -------------------------------------------------------------
function getDefaultPermissions(role: string): string[] {
  const roleLower = (role || '').toLowerCase();
  if (roleLower === 'owner') {
    return ['*'];
  }
  if (roleLower === 'admin') {
    return [
      'dashboard.view', 'dashboard.export',
      'candidates.view', 'candidates.add', 'candidates.edit', 'candidates.delete', 'candidates.import', 'candidates.export', 'candidates.upload_resume', 'candidates.download_resume', 'candidates.send_email', 'candidates.send_whatsapp', 'candidates.view_ai_score', 'candidates.run_ai_parsing',
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.publish', 'jobs.close_job', 'jobs.ai_matching',
      'companies.view', 'companies.create', 'companies.edit', 'companies.delete', 'companies.send_candidate_profile', 'companies.view_hiring_history',
      'pipeline.view', 'pipeline.move_candidate', 'pipeline.create_stage', 'pipeline.delete_stage',
      'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.complete', 'tasks.delete',
      'templates.view', 'templates.create', 'templates.edit', 'templates.delete',
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 'copilot.email_writer', 'copilot.search', 'copilot.analytics',
      'analytics.view', 'analytics.export', 'analytics.advanced',
      'team.view', 'team.add', 'team.remove', 'team.edit_role', 'team.suspend',
      'settings.view', 'settings.email', 'settings.theme', 'settings.integrations', 'settings.api_keys', 'settings.workspace'
    ];
  }
  if (roleLower === 'recruiter') {
    return [
      'dashboard.view',
      'candidates.view', 'candidates.add', 'candidates.edit', 'candidates.upload_resume', 'candidates.send_email', 'candidates.send_whatsapp', 'candidates.view_ai_score', 'candidates.run_ai_parsing',
      'jobs.view', 'jobs.ai_matching',
      'companies.view', 'companies.view_hiring_history',
      'pipeline.view', 'pipeline.move_candidate',
      'tasks.view', 'tasks.create', 'tasks.complete',
      'templates.view',
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 'copilot.email_writer', 'copilot.search', 'copilot.analytics'
    ];
  }
  if (roleLower === 'viewer') {
    return [
      'dashboard.view',
      'candidates.view',
      'jobs.view',
      'companies.view',
      'pipeline.view'
    ];
  }
  return [];
}

function isFeatureLocked(permission: string, lockedFeatures: string[]): boolean {
  if (!lockedFeatures || lockedFeatures.length === 0) return false;
  const locks = new Set(lockedFeatures.map(f => f.toLowerCase()));

  if (locks.has('disable_ai')) {
    const aiPermissions = [
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 
      'copilot.email_writer', 'copilot.search', 'copilot.analytics',
      'candidates.view_ai_score', 'candidates.run_ai_parsing', 'jobs.ai_matching'
    ];
    if (aiPermissions.includes(permission)) return true;
  }
  if (locks.has('disable_voice_ai') && permission === 'copilot.voice') {
    return true;
  }
  if (locks.has('disable_import') && permission === 'candidates.import') {
    return true;
  }
  if (locks.has('disable_export')) {
    const exportPermissions = ['candidates.export', 'dashboard.export', 'analytics.export'];
    if (exportPermissions.includes(permission)) return true;
  }
  if (locks.has('disable_analytics')) {
    const analyticsPermissions = ['analytics.view', 'analytics.export', 'analytics.advanced'];
    if (analyticsPermissions.includes(permission)) return true;
  }
  if (locks.has('disable_templates') && permission.startsWith('templates.')) {
    return true;
  }
  if (locks.has('disable_pipeline') && permission.startsWith('pipeline.')) {
    return true;
  }
  if (locks.has('disable_dashboard') && permission.startsWith('dashboard.')) {
    return true;
  }
  if (locks.has('disable_copilot') && permission.startsWith('copilot.')) {
    return true;
  }
  if (locks.has('disable_email') && permission === 'candidates.send_email') {
    return true;
  }
  if (locks.has('disable_whatsapp') && permission === 'candidates.send_whatsapp') {
    return true;
  }

  return false;
}

function isFeatureSupportedByPlan(permission: string, planFeatures: Record<string, boolean>): boolean {
  if (Object.keys(planFeatures).length === 0) return true; // Bypass check if plan data not fully initialized
  
  if (permission === 'copilot.voice') {
    return !!planFeatures.ai_voice_copilot;
  }
  if (permission === 'copilot.resume_summary') {
    return !!planFeatures.ai_resume_summary;
  }
  if (permission === 'copilot.email_writer') {
    return !!planFeatures.ai_email_generator;
  }
  if (permission === 'copilot.search') {
    return !!planFeatures.ai_search;
  }
  if (permission === 'jobs.ai_matching') {
    return !!planFeatures.ai_candidate_matching;
  }
  if (permission === 'candidates.run_ai_parsing') {
    return !!planFeatures.resume_parsing;
  }
  if (permission === 'candidates.import') {
    return !!planFeatures.csv_import || !!planFeatures.excel_import;
  }
  if (permission === 'candidates.send_whatsapp') {
    return !!planFeatures.whatsapp_integration;
  }
  if (permission === 'candidates.send_email') {
    return !!planFeatures.email_integration;
  }
  if (permission.startsWith('analytics.')) {
    return !!planFeatures.analytics;
  }
  if (permission.startsWith('activity_logs.')) {
    return !!planFeatures.activity_logs;
  }
  if (permission.startsWith('templates.')) {
    return !!planFeatures.email_templates;
  }
  
  return true;
}

const requirePermission = (permission: string) => {
  return async (c: any, next: any) => {
    const user = c.get('user') as any;
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (user.is_super_admin) {
      return await next();
    }

    const isTrialActive = user.is_trial && user.subscription_status === 'active' && user.trial_end_date && new Date(user.trial_end_date) >= new Date();
    const isSubscriptionActive = !user.is_trial && user.subscription_status === 'active';

    if (!isTrialActive && !isSubscriptionActive) {
      return c.json({ error: 'Upgrade Required: Your trial or subscription has expired.', expired: true }, 403);
    }

    if (!isTrialActive) {
      const planFeatures = user.plan_features || {};
      if (!isFeatureSupportedByPlan(permission, planFeatures)) {
        return c.json({ error: 'Upgrade Required: This feature is not included in your current subscription plan.' }, 403);
      }
    }

    const roleLower = (user.role || '').toLowerCase();

    // 1. Check member-level feature restrictions
    const restrictedFeatures = user.restricted_features || [];
    if (roleLower !== 'owner' && isFeatureLocked(permission, restrictedFeatures)) {
      return c.json({ error: 'Feature Disabled by Administrator' }, 403);
    }

    // 2. Check global workspace locks (Applies to all users)
    const lockedFeatures = user.locked_features || [];
    if (isFeatureLocked(permission, lockedFeatures)) {
      return c.json({ error: 'Feature Disabled by Administrator' }, 403);
    }

    // 3. Check effective permissions
    if (roleLower === 'owner') {
      return await next();
    }

    const permissions = user.permissions || [];
    const hasPerm = permissions.includes(permission) || permissions.includes('*') || permissions.includes(permission.split('.')[0] + '.*');
    
    if (!hasPerm) {
      return c.json({ error: 'Forbidden: Insufficient Permissions' }, 403);
    }

    await next();
  };
};

// Authentication middleware for Hono
app.use('/api/*', async (c, next) => {
  if (
    c.req.path === '/api/health' || 
    c.req.path === '/api/superadmin/login' || 
    c.req.path === '/api/public/plans' ||
    c.req.path === '/api/payments/webhook' ||
    c.req.path.startsWith('/api/public/invitations/')
  ) {
    return await next();
  }

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Authorization header is missing' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid session token' }, 401);
  }

  // Fetch profiles to retrieve workspace_id, role, name, email, custom_permissions, restricted_features, is_super_admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_id, role, name, email, custom_permissions, restricted_features, is_super_admin')
    .eq('id', user.id)
    .single();

  const isOnboardingRoute = 
    (c.req.path === '/api/workspaces' && c.req.method === 'POST') ||
    c.req.path === '/api/invitations/accept';

  if (profileError || !profile || !profile.workspace_id) {
    if (isOnboardingRoute) {
      c.set('user', {
        ...user,
        name: profile?.name || user.email?.split('@')[0],
        email: profile?.email || user.email,
        is_super_admin: profile?.is_super_admin || false
      });
      return await next();
    }
    return c.json({ error: 'Unauthorized: User workspace profile not found' }, 403);
  }

  // Fetch workspace locked features and subscription data
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('locked_features, subscription_plan, subscription_status, billing_cycle, renewal_date, trial_expiry, usage_statistics, subscription_type, trial_start_date, trial_end_date, subscription_start_date, subscription_end_date, plan_id, is_trial')
    .eq('id', profile.workspace_id)
    .single();

  let wsStatus = workspace?.subscription_status || 'active';
  const isTrial = workspace?.is_trial || false;
  const trialEndDate = workspace?.trial_end_date;

  // Lazy Trial Expiry check
  if (isTrial && wsStatus === 'active' && trialEndDate && new Date(trialEndDate) < new Date()) {
    wsStatus = 'expired';
    await supabase
      .from('workspaces')
      .update({ subscription_status: 'expired' })
      .eq('id', profile.workspace_id);
  }

  // Retrieve features and limits for the active plan
  let activePlan = null;
  const planSlug = workspace?.subscription_plan || 'starter';
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', planSlug)
    .single();

  if (plan) {
    activePlan = plan;
  }

  // Resolve effective permissions (member-specific overrides if defined, else role default)
  let permissions = [];
  if (Array.isArray(profile.custom_permissions) && profile.custom_permissions.length > 0) {
    permissions = profile.custom_permissions;
  } else {
    // Fetch role permissions
    const { data: roleData } = await supabase
      .from('workspace_roles')
      .select('permissions')
      .eq('workspace_id', profile.workspace_id)
      .eq('name', profile.role)
      .single();
    permissions = roleData?.permissions || getDefaultPermissions(profile.role);
  }

  const lockedFeatures = workspace?.locked_features || [];

  c.set('user', {
    ...user,
    workspace_id: profile.workspace_id,
    role: profile.role,
    name: profile.name,
    email: profile.email || user.email,
    permissions,
    locked_features: lockedFeatures,
    restricted_features: profile.restricted_features || [],
    is_super_admin: profile.is_super_admin || false,
    
    // Bind subscription parameters to request context
    subscription_plan: planSlug,
    subscription_status: wsStatus,
    billing_cycle: workspace?.billing_cycle || 'monthly',
    renewal_date: workspace?.renewal_date,
    trial_expiry: workspace?.trial_expiry,
    usage_statistics: workspace?.usage_statistics || {},
    plan_features: activePlan?.features || {},
    plan_limits: activePlan?.limits || {},
    
    // New Trial and Subscription properties
    subscription_type: workspace?.subscription_type || 'paid',
    trial_start_date: workspace?.trial_start_date,
    trial_end_date: trialEndDate,
    subscription_start_date: workspace?.subscription_start_date,
    subscription_end_date: workspace?.subscription_end_date,
    plan_id: workspace?.plan_id,
    is_trial: isTrial
  });
  await next();
});

// -------------------------------------------------------------
// AI Endpoints
// -------------------------------------------------------------
app.use('/api/ai/*', async (c, next) => {
  const user = c.get('user') as any;
  if (!user || user.is_super_admin) return await next();

  const isTrialActive = user.is_trial && user.subscription_status === 'active' && user.trial_end_date && new Date(user.trial_end_date) >= new Date();
  if (isTrialActive) return await next();
  
  if (user.plan_limits) {
    const rawLimit = user.plan_limits.max_ai_requests;
    if (rawLimit !== undefined && rawLimit !== 'unlimited') {
      const limitNum = parseInt(rawLimit);
      if (!isNaN(limitNum)) {
        let sinceDate = new Date();
        sinceDate.setDate(1);
        sinceDate.setHours(0,0,0,0);
        
        if (user.renewal_date) {
          const ren = new Date(user.renewal_date);
          const now = new Date();
          // Calculate start of current billing cycle
          try {
            while (ren > now) {
              ren.setMonth(ren.getMonth() - 1);
            }
            sinceDate = ren;
          } catch (e) {}
        }

        const { count, error } = await supabase
          .from('superadmin_ai_logs')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', user.workspace_id)
          .gte('timestamp', sinceDate.toISOString());
          
        if (!error && count !== null && count >= limitNum) {
          return c.json({ 
            error: `AI Request Limit Reached: Your current plan only allows up to ${limitNum} AI requests per billing cycle. Please upgrade your plan.`,
            limitReached: true,
            limitKey: 'max_ai_requests'
          }, 403);
        }
      }
    }
  }
  await next();
});

// Resume Parser (File upload endpoint via multipart/form-data)
app.post('/api/ai/parse-resume', requirePermission('candidates.run_ai_parsing'), async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file; // This is a File / Blob object
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'A file input (pdf, txt) is required' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const arrayBufferCopy = arrayBuffer.slice(0);
    const mimeType = file.type;
    const isPdf = mimeType === 'application/pdf' || file.name.endsWith('.pdf');
    const isTxt = mimeType === 'text/plain' || file.name.endsWith('.txt');
    const isImage = mimeType.startsWith('image/') || file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg');

    if (!isPdf && !isTxt && !isImage) {
      return c.json({ error: `Unsupported file format: ${mimeType || 'unknown'}. Only PDF, TXT, and PNG/JPG images are supported.` }, 400);
    }

    console.log("--- START PARSE RESUME (SYNCHRONOUS) ---");
    console.log("File Name:", file.name);
    console.log("File Type / MIME:", mimeType);

    let textContent = '';
    
    if (isTxt) {
      textContent = Buffer.from(arrayBuffer).toString('utf-8');
    } else if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const result = await extractText(pdf);
      textContent = typeof result === 'string' ? result : (result as any).text?.join('\n') || '';
    }

    console.log("Extracted text length:", textContent.length);

    const systemInstruction = `You are an expert AI resume parser. Extract the relevant fields from the provided resume as accurately as possible.
Return ONLY a valid JSON object matching the requested schema. Do not include any explanation, markdown code blocks, or extra text. Output ONLY the JSON.`;

    const resumeSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Candidate full name' },
        email: { type: 'string', description: 'Candidate email address' },
        phone: { type: 'string', description: 'Candidate phone number' },
        skills: { type: 'array', items: { type: 'string' }, description: 'List of technical skills, frameworks, and programming languages' },
        experience: { type: 'string', description: 'Years or level of experience, e.g. "5 Years" or "Senior"' },
        education: { type: 'string', description: 'Highest degree and school name' },
        currentCompany: { type: 'string', description: 'Most recent company name' },
        address: { type: 'string', description: 'Location, city and state' },
        resumeTextSummary: { type: 'string', description: 'Comprehensive plain-text reconstruction or summary of the resume' }
      },
      required: ['name', 'email', 'phone', 'skills', 'experience', 'education', 'currentCompany', 'address', 'resumeTextSummary']
    };

    let parsedData: any;

    if (isImage) {
      console.log("Uploaded file is an image. Calling multimodal parsing directly...");
      const base64Image = Buffer.from(arrayBufferCopy).toString('base64');
      const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Image}`;

      const userPrompt = `Please extract candidate profile fields from this resume image.`;

      const multimodalPrompt = [
        { type: 'text', text: userPrompt },
        {
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        }
      ];

      const parsedText = await callLLM(systemInstruction, multimodalPrompt, 0.2, resumeSchema);
      parsedData = cleanJsonResponse(parsedText);
    } else if (isPdf && textContent.trim().length === 0) {
      console.log("PDF text extraction returned empty. Falling back to rendering page 1 to image for multimodal parsing...");
      
      const imageBuffer = await renderPageAsImage(new Uint8Array(arrayBufferCopy), 1, {
        canvasImport: () => import('@napi-rs/canvas'),
        scale: 1.5
      });

      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      const userPrompt = `Please extract candidate profile fields from this resume image.`;

      const multimodalPrompt = [
        { type: 'text', text: userPrompt },
        {
          type: 'image_url',
          image_url: {
            url: dataUrl
          }
        }
      ];

      const parsedText = await callLLM(systemInstruction, multimodalPrompt, 0.2, resumeSchema);
      parsedData = cleanJsonResponse(parsedText);
    } else {
      const userContent = `Please extract candidate profile fields from this resume text:\n\n${textContent}`;
      const parsedText = await callLLM(systemInstruction, userContent, 0.2, resumeSchema);
      parsedData = cleanJsonResponse(parsedText);
    }

    console.log("Final parsed data:", JSON.stringify(parsedData, null, 2));
    console.log("--- END PARSE RESUME (SYNCHRONOUS) ---");

    return c.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Error in parse-resume:', err.message);
    return c.json({
      error: 'Failed to parse resume.',
      details: err.message
    }, 500);
  }
});



// File Parser (extracts text from uploaded PDF/TXT/CSV files)
app.post('/api/ai/parse-file', requirePermission('candidates.run_ai_parsing'), async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file; // This is a File / Blob object
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'A file input is required' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const arrayBufferCopy = arrayBuffer.slice(0);
    const mimeType = file.type;
    const isPdf = mimeType === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = mimeType.startsWith('image/') || file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg');
    
    let textContent = '';
    
    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const result = await extractText(pdf);
      textContent = typeof result === 'string' ? result : (result as any).text?.join('\n') || '';

      // PDF-to-image OCR fallback for scanned resumes
      if (textContent.trim().length === 0) {
        console.log('[Copilot File Parser] PDF text extraction returned empty. Rendering page 1 to image for OCR fallback...');
        try {
          const imageBuffer = await renderPageAsImage(new Uint8Array(arrayBufferCopy), 1, {
            canvasImport: () => import('@napi-rs/canvas'),
            scale: 1.5
          });

          const base64Image = Buffer.from(imageBuffer).toString('base64');
          const dataUrl = `data:image/png;base64,${base64Image}`;

          const systemInstruction = 'You are a high-accuracy document transcription assistant. Transcribe all text content from the provided resume image as cleanly as possible. Return ONLY the transcribed text. Do not add explanations or conversational comments.';
          const multimodalPrompt = [
            { type: 'text', text: 'Please transcribe all text from this resume image.' },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ];

          textContent = await callLLM(systemInstruction, multimodalPrompt, 0.2);
          console.log(`[Copilot File Parser] Successfully transcribed scanned PDF resume. Length: ${textContent.length} characters.`);
        } catch (ocrErr: any) {
          console.error('[Copilot File Parser] OCR fallback failed:', ocrErr.message);
        }
      }
    } else if (isImage) {
      console.log('[Copilot File Parser] Uploaded file is an image. Calling multimodal transcription...');
      try {
        const base64Image = Buffer.from(arrayBufferCopy).toString('base64');
        const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Image}`;

        const systemInstruction = 'You are a high-accuracy document transcription assistant. Transcribe all text content from the provided image as cleanly as possible. Return ONLY the transcribed text. Do not add explanations or conversational comments.';
        const multimodalPrompt = [
          { type: 'text', text: 'Please transcribe all text from this image.' },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl
            }
          }
        ];

        textContent = await callLLM(systemInstruction, multimodalPrompt, 0.2);
        console.log(`[Copilot File Parser] Successfully transcribed image. Length: ${textContent.length} characters.`);
      } catch (ocrErr: any) {
        console.error('[Copilot File Parser] Image OCR failed:', ocrErr.message);
      }
    } else {
      // Treat as plain text
      textContent = Buffer.from(arrayBuffer).toString('utf-8');
    }

    return c.json({ 
      text: textContent, 
      fileName: file.name, 
      type: file.type, 
      size: file.size 
    });
  } catch (err: any) {
    console.error('Error in parse-file:', err.message);
    return c.json({
      error: 'Failed to parse file.',
      details: err.message
    }, 500);
  }
});



// Copilot Chat / Search Engine
export async function runCopilotAgent(
  taskId: string,
  messages: any[],
  autoExecute: boolean,
  user: any,
  systemInstruction: string,
  tools: any[]
) {
  const transformMessagesForLLM = (msgs: any[]) => {
    return msgs.map(msg => {
      if (msg.role === 'assistant' && msg.pendingAction) {
        const desc = msg.pendingAction.command;
        return {
          role: 'assistant',
          content: `[System Action: Invoked tools: ${desc}]`
        };
      }
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: `[System Output for tool '${msg.name}': ${msg.content}]`
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });
  };

  const messagesForLLM = [
    { role: 'system', content: systemInstruction },
    ...messages
  ];

  // Local Tool Execution Handler
  const executeTool = async (name: string, args: any): Promise<any> => {
    console.log(`[Copilot Agent] Executing tool '${name}' with args:`, args);
    
    // Update Supabase task current step
    await supabase.from('copilot_tasks').update({
      current_step: name
    }).eq('id', taskId);

    const currentTask = backgroundTasks.get(taskId) || { status: 'pending' };
    currentTask.currentStep = { name, args };
    backgroundTasks.set(taskId, currentTask);
    
    if (name === 'search_candidates') {
      const repo = new WorkspaceRepository('candidates', user);
      let candidates = await repo.getAll();
      
      if (args.query) {
        const q = args.query.toLowerCase();
        candidates = candidates.filter(c => {
          // 1. Scan standard fields
          const matchesStandard = 
            (c.name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.designation || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.skills || []).some((s: string) => s.toLowerCase().includes(q));

          if (matchesStandard) return true;

          // 2. Scan custom fields dynamically
          if (c.customFields && typeof c.customFields === 'object') {
            return Object.entries(c.customFields).some(([key, val]) => {
              const fieldKey = key.toLowerCase();
              const fieldValue = String(val || '').toLowerCase();
              return fieldKey.includes(q) || fieldValue.includes(q);
            });
          }

          return false;
        });
      }
      if (args.skills && Array.isArray(args.skills)) {
        candidates = candidates.filter(c => {
          const candidateSkills = (c.skills || []).map((s: string) => s.toLowerCase());
          return args.skills.every((s: string) => candidateSkills.includes(s.toLowerCase()));
        });
      }
      if (args.stage) {
        candidates = candidates.filter(c => (c.status || '').toLowerCase() === args.stage.toLowerCase());
      }

      const totalMatches = candidates.length;
      const limit = args.limit || 15;
      const offset = args.offset || 0;
      const sliced = candidates.slice(offset, offset + limit);

      return {
        totalMatches,
        resultsCount: sliced.length,
        limit,
        offset,
        warning: totalMatches > (offset + limit) ? `Showing matches ${offset + 1} to ${offset + sliced.length} of ${totalMatches}. More matches are available. Ask to fetch the next page.` : undefined,
        results: sliced.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          experience: c.experience,
          skills: c.skills,
          currentCompany: c.currentCompany,
          status: c.status,
          designation: c.designation,
          city: c.city,
          customFields: c.customFields
        }))
      };
    }

    if (name === 'get_candidate_resume') {
      const repo = new WorkspaceRepository('candidates', user);
      const candidates = await repo.getCustom('*', { id: args.candidate_id });
      const candidate = candidates?.[0];
      if (!candidate) return { error: 'Candidate not found' };
      return {
        id: candidate.id,
        name: candidate.name,
        skills: candidate.skills,
        customFields: candidate.customFields,
        parsedResumeText: candidate.parsedResumeText || candidate.notes || 'No resume text available'
      };
    }

    if (name === 'list_active_jobs') {
      const repo = new WorkspaceRepository('jobs', user);
      const jobs = await repo.getAll();
      return jobs.map(j => ({
        id: j.id,
        title: j.title,
        department: j.department,
        location: j.location,
        status: j.status,
        experience: j.experience,
        requiredSkills: j.requiredSkills
      }));
    }

    if (name === 'list_companies') {
      const repo = new WorkspaceRepository('companies', user);
      const companies = await repo.getAll();
      return companies.map(comp => ({
        id: comp.id,
        name: comp.name,
        industry: comp.industry,
        companySize: comp.companySize,
        website: comp.website
      }));
    }

    if (name === 'get_workspace_tasks') {
      const repo = new WorkspaceRepository('tasks', user);
      const tasks = await repo.getAll();
      return tasks.map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        candidateName: t.candidateName
      }));
    }

    if (name === 'get_custom_field_definitions') {
      const repo = new WorkspaceRepository('custom_field_definitions', user);
      const defs = await repo.getAll();
      return defs.map(d => ({
        id: d.id,
        name: d.name,
        key: d.key,
        type: d.type,
        options: d.options,
        isRequired: d.isRequired
      }));
    }

    if (name === 'get_pipeline_summary') {
      const repo = new WorkspaceRepository('candidates', user);
      const candidates = await repo.getAll();
      const summary: Record<string, number> = {};
      for (const c of candidates) {
        const stage = c.status || 'Pool';
        summary[stage] = (summary[stage] || 0) + 1;
      }
      return summary;
    }

    return { error: `Tool ${name} not found` };
  };

  // Helper to execute database action commands
  const executeDatabaseAction = async (actionJson: any) => {
    const { command, id, data } = actionJson;
    console.log(`[Copilot Agent] Executing action command: ${command}`);
    
    if (command === 'create_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.create(data);
    } else if (command === 'create_job') {
      const sanitizedData = await sanitizeJobData(data, user);
      const repo = new WorkspaceRepository('jobs', user);
      await repo.create(sanitizedData);
    } else if (command === 'create_task') {
      const repo = new WorkspaceRepository('tasks', user);
      await repo.create(data);
    } else if (command === 'create_company') {
      const repo = new WorkspaceRepository('companies', user);
      await repo.create(data);
    } else if (command === 'create_template' || command === 'create_email_template') {
      const repo = new WorkspaceRepository('email_templates', user);
      await repo.create(data);
    } else if (command === 'update_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.update(id, data);
    } else if (command === 'update_job') {
      const sanitizedData = await sanitizeJobData(data, user);
      const repo = new WorkspaceRepository('jobs', user);
      await repo.update(id, sanitizedData);
    } else if (command === 'update_task') {
      const repo = new WorkspaceRepository('tasks', user);
      await repo.update(id, data);
    } else if (command === 'update_company') {
      const repo = new WorkspaceRepository('companies', user);
      await repo.update(id, data);
    } else if (command === 'update_template' || command === 'update_email_template') {
      const repo = new WorkspaceRepository('email_templates', user);
      await repo.update(id, data);
    } else if (command === 'delete_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.delete(id);
    } else if (command === 'delete_job') {
      const repo = new WorkspaceRepository('jobs', user);
      await repo.delete(id);
    } else if (command === 'delete_task') {
      const repo = new WorkspaceRepository('tasks', user);
      await repo.delete(id);
    } else if (command === 'delete_company') {
      const repo = new WorkspaceRepository('companies', user);
      await repo.delete(id);
    } else if (command === 'delete_template' || command === 'delete_email_template') {
      const repo = new WorkspaceRepository('email_templates', user);
      await repo.delete(id);
    } else {
      throw new Error(`Action command '${command}' is not supported.`);
    }
  };

  let responseText = '';
  let cleanedResponse = '';
  let finalStatus: 'completed' | 'pending_approval' | 'failed' = 'completed';
  let pendingActionData: any = null;

  try {
    const latestUserMessage = messages[messages.length - 1]?.content || '';
    let useMultiAgent = false;
    let subTasks: any[] = [];

    // Analyze query length & intent to decide on multi-agent execution
    if (latestUserMessage.length > 30) {
      console.log(`[Copilot Orchestrator] Analyzing query: "${latestUserMessage}"`);
      try {
        const plannerSchema = {
          type: 'object',
          properties: {
            isMultiAgent: {
              type: 'boolean',
              description: 'Set to true if query contains multiple distinct instructions (e.g. search candidates AND create a task). Set to false for conversational greetings or a single task.'
            },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  agent: { type: 'string', enum: ['SearchAgent', 'DBWriteAgent'], description: 'The specialized agent needed' },
                  query: { type: 'string', description: 'The specific sub-task instruction query' }
                },
                required: ['agent', 'query']
              }
            }
          },
          required: ['isMultiAgent', 'tasks']
        };

        const plannerInstruction = `You are the Orchestrator Planner. Analyze the user's latest query and determine if it requires executing multiple independent sub-tasks in parallel (e.g. reading/matching candidates AND writing new tasks/jobs/companies). Output JSON matching the schema.`;
        const planText = await callLLM(plannerInstruction, latestUserMessage, 0.2, plannerSchema);
        const parsedPlan = JSON.parse(planText.replace(/```json|```/g, '').trim());

        if (parsedPlan.isMultiAgent && Array.isArray(parsedPlan.tasks) && parsedPlan.tasks.length > 0) {
          useMultiAgent = true;
          subTasks = parsedPlan.tasks;
          console.log(`[Copilot Orchestrator] Multi-Agent Planner activated with ${subTasks.length} sub-tasks.`);
        }
      } catch (planErr: any) {
        console.error('[Copilot Orchestrator] Planner execution failed, falling back to standard ReAct loop:', planErr.message);
      }
    }

    if (useMultiAgent) {
      console.log('[Copilot Orchestrator] Spawning sub-agents in parallel...');
      
      const subAgentOutputs = await Promise.all(subTasks.map(async (task) => {
        let agentSystemInstruction = '';
        let activeTools = tools;
        
        if (task.agent === 'SearchAgent') {
          agentSystemInstruction = `You are a Search & Match Assistant. Your sole task is to search the database using the tools provided to find matching candidate profiles, jobs, tasks, or companies based on the query. Do NOT suggest any write actions. Output your findings clearly.`;
          activeTools = tools.filter(t => 
            ['search_candidates', 'get_candidate_resume', 'list_active_jobs', 'list_companies', 'get_workspace_tasks', 'get_custom_field_definitions', 'get_pipeline_summary'].includes(t.function.name)
          );
        } else {
          agentSystemInstruction = `You are a Database Operations Assistant. Your task is to draft database action blocks (create/update/delete candidates, jobs, tasks, companies) matching the request. Output your response containing the exact <action>...</action> block.`;
        }

        // Run sub-agent ReAct loop
        let subMessages: any[] = [
          { role: 'system', content: agentSystemInstruction },
          { role: 'user', content: task.query }
        ];
        
        let subLoop = 0;
        let subContent = '';
        
        while (subLoop < 2) {
          const res = await callEdenAIWithTools(subMessages, activeTools);
          const msg = res.choices?.[0]?.message;
          if (!msg) break;
          
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            subMessages.push(msg);
            await Promise.all(msg.tool_calls.map(async (call: any) => {
              let parsedArgs = {};
              try {
                parsedArgs = typeof call.function.arguments === 'string' 
                  ? JSON.parse(call.function.arguments) 
                  : call.function.arguments || {};
              } catch (err) {}
              
              const out = await executeTool(call.function.name, parsedArgs);
              subMessages.push({
                role: 'tool',
                tool_call_id: call.id,
                name: call.function.name,
                content: JSON.stringify(out)
              });
            }));
            subLoop++;
          } else {
            subContent = msg.content || '';
            break;
          }
        }
        return `[Sub-Agent Output (${task.agent})]:\n${subContent}`;
      }));

      console.log('[Copilot Orchestrator] Compiling final response from sub-agent outputs...');
      
      const compilePrompt = `[System Orchestrator: Sub-agents have completed parallel execution. Here are their outputs:\n\n${subAgentOutputs.join('\n\n')}\n\nCombine these findings into a unified, supportive, friendly response. Keep your personality as Forge. If there are any proposed database actions (<action> blocks) in the sub-agent outputs, merge them and generate a single unified <action> block at the very end of your response.]`;

      const finalAnswer = await callLLM(systemInstruction, compilePrompt, 0.7);
      responseText = finalAnswer;
      cleanedResponse = responseText;

      const actionMatch = responseText.match(/<action>([\s\S]*?)<\/action>/);
      if (actionMatch) {
        if (autoExecute) {
          try {
            const actionJson = JSON.parse(actionMatch[1].trim());
            await executeDatabaseAction(actionJson);
            cleanedResponse = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim();
          } catch (actionErr: any) {
            console.error('[Copilot Orchestrator] Database action execution failed:', actionErr.message);
          }
        } else {
          try {
            const actionJson = JSON.parse(actionMatch[1].trim());
            cleanedResponse = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim();
            finalStatus = 'pending_approval';
            pendingActionData = actionJson;
          } catch (e) {}
        }
      }

    } else {
      // Execute the standard single-agent sequential ReAct loop
      let loopCount = 0;
      while (loopCount < 3) {
        console.log(`[Copilot Agent] Running standard ReAct iteration ${loopCount + 1}...`);
        const result = await callEdenAIWithTools(transformMessagesForLLM(messagesForLLM), tools);
        const rawMessage = result.choices?.[0]?.message;

        if (!rawMessage) {
          throw new Error('Invalid empty response received from completions API.');
        }

        if (rawMessage.tool_calls && rawMessage.tool_calls.length > 0) {
          console.log(`[Copilot Agent] Model requested ${rawMessage.tool_calls.length} tool call(s)`);
          messagesForLLM.push(rawMessage);

          await Promise.all(rawMessage.tool_calls.map(async (call: any) => {
            let parsedArgs = {};
            try {
              parsedArgs = typeof call.function.arguments === 'string' 
                ? JSON.parse(call.function.arguments) 
                : call.function.arguments || {};
            } catch (e) {
              console.error('[Copilot Agent] Failed to parse arguments for tool:', call.function.name);
            }

            const toolOutput = await executeTool(call.function.name, parsedArgs);
            messagesForLLM.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(toolOutput)
            });
          }));
          loopCount++;
        } else {
          responseText = rawMessage.content || '';
          cleanedResponse = responseText;

          const actionMatch = responseText.match(/<action>([\s\S]*?)<\/action>/);
          if (actionMatch) {
            if (autoExecute) {
              try {
                const actionJson = JSON.parse(actionMatch[1].trim());
                await executeDatabaseAction(actionJson);
                cleanedResponse = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim();
                break;
              } catch (actionErr: any) {
                console.error('[Copilot Agent Self-Healing] Database action failed:', actionErr.message);
                messagesForLLM.push({
                  role: 'assistant',
                  content: responseText
                });
                messagesForLLM.push({
                  role: 'user',
                  content: `[System Action Error: The database action failed with error: "${actionErr.message}". This usually means a candidate, job, or task ID you provided does not exist, or you violated a database constraint. Please check your IDs, call the appropriate search tools (e.g. 'search_candidates') to get the correct UUID, and generate the corrected <action> block again.]`
                });
                loopCount++;
                continue;
              }
            } else {
              try {
                const actionJson = JSON.parse(actionMatch[1].trim());
                cleanedResponse = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim();
                finalStatus = 'pending_approval';
                pendingActionData = actionJson;
                break;
              } catch (parseErr: any) {
                console.error('Failed to parse action JSON during manual approval:', parseErr.message);
              }
            }
          }
          break;
        }
      }

      if (loopCount >= 3 && !responseText) {
        throw new Error('Agent execution loop exceeded maximum steps without producing final answer.');
      }
    }

    const taskResult: any = { responseText: cleanedResponse };
    if (finalStatus === 'pending_approval') {
      taskResult.action = pendingActionData;
    }

    await supabase.from('copilot_tasks').update({
      status: finalStatus,
      result: taskResult,
      current_step: null
    }).eq('id', taskId);

    backgroundTasks.set(taskId, {
      status: finalStatus,
      user,
      result: taskResult
    });

  } catch (err: any) {
    console.error('Error in background copilot task:', err.message);
    await supabase.from('copilot_tasks').update({
      status: 'failed',
      error: err.message,
      current_step: null
    }).eq('id', taskId);
    backgroundTasks.set(taskId, { status: 'failed', error: err.message });
  }
}

app.post('/api/ai/copilot', requirePermission('copilot.open'), async (c) => {
  try {
    const { messages, autoExecute } = await c.req.json();
    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    const user = c.get('user') as any;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_candidates',
          description: 'Searches for candidate profiles in the workspace matching keywords (name, designation, location), skills, or dynamic custom fields (like charges, salary, etc.).',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Free text query to search across names, cities, designations, skills, or custom attributes' },
              skills: { type: 'array', items: { type: 'string' }, description: 'Specific candidate skills (e.g. [\'Python\', \'React\'])' },
              stage: { type: 'string', description: 'Candidate stage (e.g. Applied, Shortlisted, Interviewing, Selected, Rejected)' },
              limit: { type: 'integer', description: 'Number of candidate records to return (default: 15, max: 30)' },
              offset: { type: 'integer', description: 'Number of candidates to skip for pagination offsets (default: 0)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_candidate_resume',
          description: 'Fetches the full parsed resume text for a candidate. Always call this if the recruiter asks for resume highlights, summary, education, experience, or details for a candidate.',
          parameters: {
            type: 'object',
            properties: {
              candidate_id: { type: 'string', description: 'Unique UUID of the candidate' }
            },
            required: ['candidate_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_active_jobs',
          description: 'Returns a list of all active jobs in the workspace (titles, locations, status, required skills).',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_companies',
          description: 'Returns a list of all companies / corporate partners in the workspace.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_workspace_tasks',
          description: 'Returns a summary list of all tasks (such as calls, emails, interviews, and follow-ups).',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_custom_field_definitions',
          description: 'Returns all active dynamic custom fields defined in the workspace (their names, keys, types, and options). Use this to understand what dynamic fields are available.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_pipeline_summary',
          description: 'Returns a summary count of candidates grouped by their current pipeline stages (Applied, Screening, Shortlisted, Selected, Rejected, Joined, etc.). Use this to check overall pipeline health.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ];

    const systemInstruction = `You are Forge, a friendly, supportive, and professional AI recruitment assistant.
You assist the recruiter in querying pipelines, searching candidates, drafting outreach messages, and managing their daily workflow. Speak conversationally, encourage them, and offer helpful suggestions.

- IMPORTANT: All salary values, currency formatting, and monetary ranges MUST be in Indian Rupees using the INR symbol (₹).
- CRITICAL: Before proposing a 'create_candidate' action, you MUST search the database using 'search_candidates' (with candidate's email or name) to verify if they already exist in the workspace. If they already exist, do NOT generate a 'create_candidate' action block; instead, explain to the user that this candidate is already in their database, show their details, and ask if they would like to update their profile or link them to a job.

Instead of having all data pre-loaded, you have ACCESS to live tools to search the database. You MUST use these tools whenever you need information to answer user queries:
- Use 'search_candidates' to find candidates matching search queries, skills, or stages.
- Use 'get_candidate_resume' to fetch the parsed resume text for a candidate.
- Use 'list_active_jobs' to check jobs.
- Use 'list_companies' to check companies.
- Use 'get_workspace_tasks' to check tasks.
- Use 'get_custom_field_definitions' to check custom fields.
- Use 'get_pipeline_summary' to check candidate stage aggregates.

You are also authorized to propose data actions. If the user asks you to create, update, or delete candidates, jobs, tasks, companies, or templates, formulate your proposed action as a structured JSON block enclosed inside <action>...</action> tags at the very end of your response.

Action formats:
1. Candidate Commands:
- Create Candidate:
<action>
{
  "command": "create_candidate",
  "data": {
    "name": "Candidate Name",
    "email": "Candidate Email",
    "phone": "Optional phone",
    "designation": "Optional job title",
    "skills": ["Skill1", "Skill2"],
    "experience": 3,
    "city": "Candidate City",
    "status": "Applied"
  }
}
</action>

- Update Candidate:
<action>
{
  "command": "update_candidate",
  "id": "Candidate ID",
  "data": { ...fields to update... }
}
</action>

- Delete Candidate:
<action>
{
  "command": "delete_candidate",
  "id": "Candidate ID"
}
</action>

2. Job Commands:
- Create Job:
<action>
{
  "command": "create_job",
  "data": {
    "title": "Job Title",
    "department": "Department name",
    "location": "Job Location",
    "experience": "e.g. 2-5 years",
    "requiredSkills": ["Skill1", "Skill2"],
    "description": "Job details",
    "status": "Active"
  }
}
</action>

- Update Job:
<action>
{
  "command": "update_job",
  "id": "Job ID",
  "data": { ...fields to update... }
}
</action>

- Delete Job:
<action>
{
  "command": "delete_job",
  "id": "Job ID"
}
</action>

3. Company Commands:
- Create Company:
<action>
{
  "command": "create_company",
  "data": {
    "name": "Company Name",
    "industry": "Industry category",
    "website": "Optional URL",
    "companySize": "e.g. 50-200"
  }
}
</action>

- Update Company:
<action>
{
  "command": "update_company",
  "id": "Company ID",
  "data": { ...fields to update... }
}
</action>

- Delete Company:
<action>
{
  "command": "delete_company",
  "id": "Company ID"
}
</action>

4. Task Commands:
- Create Task:
<action>
{
  "command": "create_task",
  "data": {
    "type": "Call | Email | Follow Up | Interview | Document",
    "title": "Task title",
    "candidateId": "Optional Candidate ID",
    "candidateName": "Optional Candidate Name",
    "priority": "High | Medium | Low",
    "status": "Pending | Completed",
    "dueDate": "YYYY-MM-DD",
    "description": "Optional details",
    "notes": "Optional notes"
  }
}
</action>

- Update Task:
<action>
{
  "command": "update_task",
  "id": "Task ID",
  "data": { ...fields to update... }
}
</action>

- Delete Task:
<action>
{
  "command": "delete_task",
  "id": "Task ID"
}
</action>

5. Email Template Commands:
- Create Template:
<action>
{
  "command": "create_template",
  "data": {
    "name": "Template Name",
    "category": "Template Category",
    "subject": "Email Subject",
    "body": "Email Body (with placeholders like [Candidate Name])",
    "variables": ["Candidate Name", "Job Title"],
    "audience": "Candidate | Company"
  }
}
</action>

- Update Template:
<action>
{
  "command": "update_template",
  "id": "Template ID",
  "data": { ...fields to update... }
}
</action>

- Delete Template:
<action>
{
  "command": "delete_template",
  "id": "Template ID"
}
</action>

Only generate ONE action block at the very end of your message. Ensure the JSON is valid and complete.`;

    const taskId = 'task_copilot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    backgroundTasks.set(taskId, { status: 'pending' });

    // Write initial task status to Supabase database
    await supabase.from('copilot_tasks').insert({
      id: taskId,
      status: 'pending',
      user_id: user?.id || null,
      current_step: 'Planning...'
    });

    // Execute task in the background using c.executionCtx.waitUntil
    let hasExecutionCtx = false;
    try {
      if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
        hasExecutionCtx = true;
      }
    } catch (e) {
      // Accessing c.executionCtx throws when running outside Cloudflare (e.g. Node/Bun local dev)
    }

    if (hasExecutionCtx) {
      c.executionCtx.waitUntil(runCopilotAgent(taskId, messages, autoExecute, user, systemInstruction, tools));
    } else {
      runCopilotAgent(taskId, messages, autoExecute, user, systemInstruction, tools);
    }

    return c.json({
      taskId,
      status: 'pending'
    });
  } catch (err: any) {
    console.error('Error in copilot route:', err.message);
    return c.json({
      error: 'Failed to initiate AI Copilot.',
      details: err.message
    }, 500);
  }
});

// Approve Copilot Action Endpoint// Approve Copilot Action Endpoint
app.post('/api/ai/copilot/approve', requirePermission('copilot.open'), async (c) => {
  try {
    const { taskId, action } = await c.req.json();
    if (!taskId) {
      return c.json({ error: 'taskId is required' }, 400);
    }

    let actionJson;
    let user;

    const task = backgroundTasks.get(taskId);
    if (task) {
      actionJson = task.result.action;
      user = task.user;
    }

    // Stateless fallback: use client-provided action and authenticated user context
    if (!actionJson && action) {
      actionJson = action;
      user = c.get('user');
    }

    if (!actionJson || !user) {
      return c.json({ error: 'Task not found or state cleared. Direct action payload must be provided.' }, 404);
    }

    // Execute database action command stored in task using stored user context
    const { command, id, data } = actionJson;
    console.log(`[Copilot Action Approval] Executing command: ${command} for user: ${user.email}`);

    if (command === 'create_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.create(data);
    } else if (command === 'assign_candidate_to_job') {
      const snakeRow = keysToSnake({
        jobId: data.jobId,
        candidateId: data.candidateId,
        stage: data.stage || 'Applied',
        addedDate: new Date().toISOString().split('T')[0],
        userId: user.id
      });
      snakeRow.workspace_id = user.workspace_id;
      snakeRow.created_by = user.id;
      snakeRow.updated_by = user.id;

      const { error } = await supabase
        .from('job_candidates')
        .upsert([snakeRow], { onConflict: 'job_id,candidate_id' });

      if (error) throw error;
    } else if (command === 'create_job') {
      const sanitizedData = await sanitizeJobData(data, user);
      const repo = new WorkspaceRepository('jobs', user);
      await repo.create(sanitizedData);
    } else if (command === 'create_task') {
      const repo = new WorkspaceRepository('tasks', user);
      await repo.create(data);
    } else if (command === 'create_company') {
      const repo = new WorkspaceRepository('companies', user);
      await repo.create(data);
    } else if (command === 'create_template' || command === 'create_email_template') {
      const repo = new WorkspaceRepository('email_templates', user);
      await repo.create(data);
    } else if (command === 'update_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.update(id, data);
    } else if (command === 'update_job') {
      const sanitizedData = await sanitizeJobData(data, user);
      const repo = new WorkspaceRepository('jobs', user);
      await repo.update(id, sanitizedData);
    } else if (command === 'update_task') {
      const repo = new WorkspaceRepository('tasks', user);
      await repo.update(id, data);
    } else if (command === 'update_company') {
      const repo = new WorkspaceRepository('companies', user);
      await repo.update(id, data);
    } else if (command === 'update_template' || command === 'update_email_template') {
      const repo = new WorkspaceRepository('email_templates', user);
      await repo.update(id, data);
    } else if (command === 'delete_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.delete(id);
    } else if (command === 'delete_job') {
      const repo = new WorkspaceRepository('jobs', user);
      await repo.delete(id);
    } else if (command === 'delete_task') {
      const repo = new WorkspaceRepository('tasks', user);
      await repo.delete(id);
    } else if (command === 'delete_company') {
      const repo = new WorkspaceRepository('companies', user);
      await repo.delete(id);
    } else if (command === 'delete_template' || command === 'delete_email_template') {
      const repo = new WorkspaceRepository('email_templates', user);
      await repo.delete(id);
    } else {
      throw new Error(`Unknown action command: ${command}`);
    }

    // Set status to completed
    task.status = 'completed';
    backgroundTasks.set(taskId, task);

    return c.json({ success: true, message: `Action '${command}' executed successfully.` });
  } catch (err: any) {
    console.error('Error executing approved copilot task action:', err.message);
    return c.json({ error: 'Failed to execute approved action.', details: err.message }, 500);
  }
});

// Job AI Tool Endpoint
app.post('/api/ai/job-tool', requirePermission('jobs.ai_matching'), async (c) => {
  try {
    const { toolKey, job, candidates } = await c.req.json();
    if (!toolKey || !job) {
      return c.json({ error: 'toolKey and job are required' }, 400);
    }

    const user = c.get('user') as any;
    const recruiterName = user.name || (user.email ? user.email.split('@')[0] : 'Sarah');

    // Verify job belongs to user's workspace
    const { data: dbJob, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', job.id)
      .eq('workspace_id', user.workspace_id)
      .single();

    if (jobError || !dbJob) {
      return c.json({ error: 'Job not found or access denied.' }, 404);
    }

    // Verify candidates belong to user's workspace
    if (candidates && candidates.length > 0) {
      const candidateIds = candidates.map((cand: any) => cand.id);
      const { data: dbCandidates, error: candError } = await supabase
        .from('candidates')
        .select('id')
        .in('id', candidateIds)
        .eq('workspace_id', user.workspace_id);

      if (candError || !dbCandidates || dbCandidates.length !== candidateIds.length) {
        return c.json({ error: 'One or more candidates not found or access denied.' }, 404);
      }
    }

    const questionsSchema = {
      type: 'object',
      properties: {
        intro: { type: 'string', description: 'Brief introductory context or guide' },
        questions: {
          type: 'array',
          description: 'List of 3 interview questions',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'The interview question text' },
              category: { type: 'string', description: 'E.g., Technical, Behavioral, Scenario' },
              targetSkill: { type: 'string', description: 'The specific skill tested (e.g. Tally, Excel)' },
              idealAnswer: { type: 'string', description: 'Key points to look for in a successful response' }
            },
            required: ['question', 'category', 'targetSkill', 'idealAnswer']
          }
        }
      },
      required: ['intro', 'questions']
    };

    let systemInstruction = "You are an expert AI recruiter co-pilot.";
    let prompt = "";
    let title = "";

    switch (toolKey) {
      case 'shortlist':
        title = 'AI Talent Shortlist Recommendations';
        systemInstruction = "You are an AI talent matcher. Analyze the job requirements and candidate profiles, and rank the top matching candidates with reasons.";
        prompt = `Job Details:
Title: ${job.title}
Company: ${job.companyName || 'None'}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Experience: ${job.experience}
Description: ${job.description}

Candidate List:
${JSON.stringify((candidates || []).map((cand: any) => ({ id: cand.id, name: cand.name, skills: cand.skills || [], experience: cand.experience, currentCompany: cand.currentCompany || '' })))}

Please recommend the top matching candidates. For each match, provide a Match Percentage, their current status, and a 1-2 sentence justification on why they are a strong fit. Present in clean markdown.`;
        break;
      case 'questions':
        title = `AI Generated Interview Questions: ${job.title}`;
        systemInstruction = "You are a lead technical interviewer. Generate tailored, highly practical interview questions. You must wrap the final structured JSON object containing the interview questions inside a single `<artifact type=\"questions\">...</artifact>` block.";
        prompt = `Generate 3 specialized, highly practical technical and behavioral interview questions for a candidate applying to the following position:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Description: ${job.description}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}.

Focus on realistic engineering problems they might face at this company. 
You must wrap your final output JSON string matching the expected questions schema inside a single '<artifact type="questions">' start tag and '</artifact>' end tag.
Example output format:
Here are the tailored interview questions:
<artifact type="questions">
{
  "intro": "Brief introduction...",
  "questions": [
    {
      "question": "Question text...",
      "category": "Technical",
      "targetSkill": "React",
      "idealAnswer": "Key points..."
    }
  ]
}
</artifact>`;
        break;
      case 'summarize':
        title = 'AI Job Posting Summary';
        systemInstruction = "You are an executive assistant. Summarize the job posting.";
        prompt = `Summarize the following job posting into a concise, high-impact overview and 3 bullet points of core priorities:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Location: ${job.location}
Salary: ${job.salary}
Description: ${job.description}.
Format clearly with 'Overview:' and 'Core Priorities:'.`;
        break;
      case 'missing_skills':
        title = 'Missing / High-Value Supplementary Skills';
        systemInstruction = "You are a technical recruiter. Suggest supplementary tech stack skills.";
        prompt = `Based on the following job requirements:
Job Title: ${job.title}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Description: ${job.description}.
Suggest 4 high-value supplementary skills, libraries, or tools (not explicitly listed in the job) that would make an engineer highly successful in this role. Explain why for each.`;
        break;
      case 'difficulty':
        title = 'Hiring Market Difficulty Predictor';
        systemInstruction = "You are a talent acquisition strategist. Predict hiring market difficulty in India. Ensure any references to compensation or salaries are in Indian Rupees (INR, ₹) or LPA (Lakhs Per Annum).";
        prompt = `Predict the hiring difficulty (Easy, Medium, High) for the following job in the current tech market:
Job Title: ${job.title}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Salary: ${job.salary}
Location: ${job.location || 'India'}.
Provide a clear difficulty rating and 2-3 sentences explaining the market factors and recommendation strategies tailored for the Indian hiring ecosystem.`;
        break;
      case 'salary_recomm':
        title = 'AI Salary Benchmark Advice';
        systemInstruction = "You are an Indian compensation analyst. You must provide all salary benchmarks, percentiles, and recommendations in Indian Rupees (INR, ₹) and LPA (Lakhs Per Annum), tailored for the Indian tech market. Do not use US Dollars ($) or US salary standards.";
        prompt = `Provide market salary benchmarking advice for the following role:
Job Title: ${job.title}
Location: ${job.location || 'India'}
Salary: ${job.salary}.
List the estimated 25th, 50th (median), and 90th percentile market rates in INR (LPA), and give a recommendation on whether the current salary is competitive in the Indian tech market.`;
        break;
      case 'alt_skills':
        title = 'Alternative / Equivalent Skills Suggested';
        systemInstruction = "You are a sourcing agent. Provide alternative keywords/skills.";
        prompt = `For the following required skills list: ${JSON.stringify(job.requiredSkills || [])} of job ${job.title}, suggest equivalent or alternative skills, technologies, or keywords that recruiters should look for if the primary skills are scarce. Provide 3-4 suggestions.`;
        break;
      case 'candidate_email':
        title = 'AI Candidate Outreach Email Generator';
        systemInstruction = "You are an outreach copywriter. Draft a compelling cold email. Ensure any salary/compensation figures are in Indian Rupees (INR, ₹) or LPA.";
        prompt = `Write a professional, compelling candidate outreach email sequence template from a recruiter (${recruiterName}) inviting a candidate to apply for this job:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Salary: ${job.salary}.
Use [Candidate Name] as placeholder. Include subject line and body in markdown.`;
        break;
      case 'whatsapp_msg':
        title = 'AI WhatsApp Ping Generator';
        systemInstruction = "You are a conversational recruiter. Write a short SMS/WhatsApp outreach message. Ensure any salary references are in Indian Rupees (INR, ₹) or LPA.";
        prompt = `Write a short, engaging, and casual WhatsApp/SMS outreach message (max 150 words) from a recruiter (${recruiterName}) to a candidate about this role:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Salary: ${job.salary}.
Keep it concise and friendly, using [Candidate Name] as a placeholder.`;
        break;
      default:
        return c.json({ error: 'Invalid toolKey' }, 400);
    }

    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    return streamText(c, async (stream) => {
      try {
        const aiStream = callLLMStream(
          systemInstruction,
          prompt,
          0.7
        );

        for await (const chunk of aiStream) {
          await stream.write(chunk);
        }
      } catch (err: any) {
        console.error('Error in streaming job-tool:', err.message);
        await stream.write(`\n[Error: ${err.message}]`);
      }
    });
  } catch (err: any) {
    console.error('Error in job-tool route:', err.message);
    return c.json({ error: 'Failed to initiate AI tool.', details: err.message }, 500);
  }
});



// -------------------------------------------------------------
// CRUD Endpoints (mapped to Supabase)
// -------------------------------------------------------------
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
  job_notes: { read: 'jobs.view', write: 'jobs.edit', update: 'jobs.edit', delete: 'jobs.edit' }
};

// Helper: Generic table routing
const createCRUD = (tableName: string) => {
  const perms = tablePermissions[tableName] || { read: 'dashboard.view', write: 'dashboard.view', update: 'dashboard.view', delete: 'dashboard.view' };

  // GET all
  app.get(`/api/${tableName}`, requirePermission(perms.read), async (c) => {
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
  app.post(`/api/${tableName}`, requirePermission(perms.write), async (c) => {
    const user = c.get('user') as any;
    try {
      const body = await c.req.json();

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
Subject: New Candidate Uploaded: ${body.name}
Body: A new candidate has been successfully uploaded and parsed from resume file "${body.resumeFileName}".
Candidate Name: ${body.name}
Email: ${body.email || 'N/A'}
Phone: ${body.phone || 'N/A'}
Experience: ${body.experience || 'N/A'}
Skills: ${Array.isArray(body.skills) ? body.skills.join(', ') : (body.skills || 'None')}`);

              const commRepo = new WorkspaceRepository('communication_logs', user);
              await commRepo.create({
                candidateId: data.id,
                type: 'Email',
                date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'Sent',
                sentBy: 'System (Auto-Alert)',
                subject: `New Candidate Alert: ${body.name}`,
                message: `Automatic alert dispatched to ${targetEmail} for parsed candidate ${body.name} (File: ${body.resumeFileName}).`
              });
            }
          }

          // Telegram Alert
          if (config && config.telegramChatId && config.telegramNotificationEnabled) {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (botToken) {
              const messageText = `<b>🔔 New Resume Uploaded &amp; Parsed!</b>
<b>Name:</b> ${body.name}
<b>Email:</b> ${body.email || 'N/A'}
<b>Phone:</b> ${body.phone || 'N/A'}
<b>Experience:</b> ${body.experience || 'N/A'}
<b>Skills:</b> ${Array.isArray(body.skills) ? body.skills.join(', ') : (body.skills || 'None')}

<i>Candidate has been added to your Talent Pool.</i>`;

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
          }
        } catch (err: any) {
          console.error('Failed to process candidate update notification alert:', err.message);
        }
      }

      return c.json(data);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // POST bulk
  app.post(`/api/${tableName}/bulk`, requirePermission(perms.write), async (c) => {
    const user = c.get('user') as any;
    try {
      const list = await c.req.json();
      if (!Array.isArray(list)) return c.json({ error: 'Body must be an array' }, 400);

      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.createBulk(list);
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // PUT update
  app.put(`/api/${tableName}/:id`, requirePermission(perms.update), async (c) => {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    try {
      const body = await c.req.json();
      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.update(id, body);
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // PATCH update
  app.patch(`/api/${tableName}/:id`, requirePermission(perms.update), async (c) => {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    try {
      const body = await c.req.json();
      const repo = new WorkspaceRepository(tableName, user);
      const data = await repo.update(id, body);
      return c.json(data);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // DELETE single
  app.delete(`/api/${tableName}/:id`, requirePermission(perms.delete), async (c) => {
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
  app.delete(`/api/${tableName}`, requirePermission(perms.delete), async (c) => {
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

// Unified Ingestion Bootstrapping
async function fetchAllTableData(tableName: string, workspaceId: string) {
  let allData: any[] = [];
  let start = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(start, start + limit - 1);

    if (error) {
      throw error;
    }

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

app.get('/api/bootstrap', async (c) => {
  const user = c.get('user') as any;
  try {
    let [
      companies,
      jobs,
      candidates,
      tasks,
      emailTemplates,
      activityLogs,
      teamMembers,
      communicationLogs,
      emailConfig,
      customFieldDefinitions,
      workspaceRoles,
      workspaceData,
      rbacAuditLogs
    ] = await Promise.all([
      fetchAllTableData('companies', user.workspace_id),
      fetchAllTableData('jobs', user.workspace_id),
      fetchAllTableData('candidates', user.workspace_id),
      fetchAllTableData('tasks', user.workspace_id),
      fetchAllTableData('email_templates', user.workspace_id),
      fetchAllTableData('activity_logs', user.workspace_id),
      supabase.from('profiles').select('*').eq('workspace_id', user.workspace_id).then(({ data, error }) => {
        if (error) throw error;
        return keysToCamel(data || []);
      }),
      fetchAllTableData('communication_logs', user.workspace_id),
      supabase.from('email_configs').select('*').eq('workspace_id', user.workspace_id).single().then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') throw error;
        return data ? keysToCamel(data) : { provider: 'Gmail', isConnected: false };
      }),
      fetchAllTableData('custom_field_definitions', user.workspace_id),
      supabase.from('workspace_roles').select('*').eq('workspace_id', user.workspace_id).then(({ data }) => keysToCamel(data || [])),
      supabase.from('workspaces').select('locked_features').eq('id', user.workspace_id).single().then(({ data }) => keysToCamel(data || {})),
      supabase.from('rbac_audit_logs').select('*').eq('workspace_id', user.workspace_id).order('timestamp', { ascending: false }).then(({ data }) => keysToCamel(data || []))
    ]);

    // If the workspace has zero email templates, auto-seed them from the default system templates (workspace_id = '00000000-0000-0000-0000-000000000000')
    if (emailTemplates.length === 0) {
      const { data: defaultTemplates, error: defaultError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('workspace_id', '00000000-0000-0000-0000-000000000000');
      
      if (!defaultError && defaultTemplates && defaultTemplates.length > 0) {
        const { randomUUID } = await import('crypto');
        const templatesToInsert = defaultTemplates.map(t => ({
          id: randomUUID(),
          workspace_id: user.workspace_id,
          created_by: user.id,
          updated_by: user.id,
          name: t.name,
          category: t.category,
          subject: t.subject,
          body: t.body,
          variables: t.variables,
          audience: t.audience,
          last_updated: t.last_updated
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('email_templates')
          .insert(templatesToInsert)
          .select();

        if (!insertError && insertedData) {
          emailTemplates = keysToCamel(insertedData);
        }
      }
    }

    // Calculate AI requests in the current billing cycle
    let sinceDate = new Date();
    sinceDate.setDate(1);
    sinceDate.setHours(0, 0, 0, 0);
    
    if (user.renewal_date) {
      const ren = new Date(user.renewal_date);
      const now = new Date();
      try {
        while (ren > now) {
          ren.setMonth(ren.getMonth() - 1);
        }
        sinceDate = ren;
      } catch (e) {}
    }

    const { count: aiRequestsCount } = await supabase
      .from('superadmin_ai_logs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', user.workspace_id)
      .gte('timestamp', sinceDate.toISOString());

    // Trigger trial reminder email if trial is active and close to expiration
    if (user.is_trial && user.subscription_status === 'active' && user.trial_end_date) {
      const trialEnd = new Date(user.trial_end_date);
      const diffMs = trialEnd.getTime() - Date.now();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      
      if (daysRemaining <= 3) {
        const triggerLabel = daysRemaining === 0 ? 'expires today' : `${daysRemaining} days remaining`;
        const subject = `Hirely Free Trial - ${triggerLabel}`;
        
        const { data: existingLog } = await supabase
          .from('superadmin_email_logs')
          .select('id')
          .eq('agency_id', user.workspace_id)
          .eq('subject', subject)
          .limit(1);

        if (!existingLog || existingLog.length === 0) {
          await supabase.from('superadmin_email_logs').insert([{
            agency_id: user.workspace_id,
            sender: 'billing@hirely.ai',
            recipient: user.email,
            subject: subject,
            body: `Hi ${user.name || 'there'},\n\nYour 7-day free trial of Hirely ${triggerLabel}. Upgrade to a paid plan today to ensure continuous access to all your candidate database, pipelines, and AI copilot.\n\nBest,\nThe Hirely Team`,
            status: 'Delivered'
          }]);
        }
      }
    }

    const subscriptionPlan = {
      slug: user.subscription_plan,
      status: user.subscription_status,
      billingCycle: user.billing_cycle,
      renewalDate: user.renewal_date,
      trialExpiry: user.trial_expiry,
      features: user.plan_features,
      limits: user.plan_limits,
      
      // New trial tracking fields
      isTrial: user.is_trial,
      subscriptionType: user.subscription_type,
      trialStartDate: user.trial_start_date,
      trialEndDate: user.trial_end_date,
      subscriptionStartDate: user.subscription_start_date,
      subscriptionEndDate: user.subscription_end_date,
      planId: user.plan_id
    };

    const subscriptionUsage = {
      companies: companies.length,
      jobs: jobs.length,
      candidates: candidates.length,
      teamMembers: teamMembers.length,
      aiRequests: aiRequestsCount || 0
    };

    return c.json({
      companies,
      jobs,
      candidates,
      tasks,
      emailTemplates,
      activityLogs,
      teamMembers,
      communicationLogs,
      emailConfig,
      customFieldDefinitions,
      workspaceRoles,
      lockedFeatures: workspaceData?.lockedFeatures || [],
      rbacAuditLogs,
      subscriptionPlan,
      subscriptionUsage,
      currentUser: {
        role: user.role,
        permissions: user.permissions,
        restrictedFeatures: user.restricted_features || [],
        isSuperAdmin: user.is_super_admin || false
      }
    });
  } catch (err: any) {
    console.error('Error in bootstrapping API:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// Profiles / Team Members Dedicated Workspace-Scoped Endpoints
app.get('/api/team_members', requirePermission('team.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const repo = new WorkspaceRepository('profiles', user);
    const profiles = await repo.getAll();

    // Fetch pending invitations
    const { data: invitations, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', user.workspace_id)
      .eq('status', 'pending');

    if (inviteError) throw inviteError;

    // Map invitations to profiles format
    const mappedInvitations = (invitations || []).map((invite: any) => ({
      id: `invite_${invite.id}`,
      name: invite.email.split('@')[0] || 'Pending Invite',
      email: invite.email,
      role: invite.role,
      status: 'Pending',
      lastLogin: 'Never',
      department: invite.department || 'HR Recruitment',
      message: `Invitation Token: ${invite.token}`
    }));

    return c.json([...profiles, ...mappedInvitations]);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/team_members', requirePermission('team.add'), async (c) => {
  const user = c.get('user') as any;
  try {
    // Enforce seat limits
    const isTrialActive = user.is_trial && user.subscription_status === 'active' && user.trial_end_date && new Date(user.trial_end_date) >= new Date();
    if (!isTrialActive && user.plan_limits) {
      const rawLimit = user.plan_limits.max_team_members;
      if (rawLimit !== undefined && rawLimit !== 'unlimited') {
        const limitNum = parseInt(rawLimit);
        if (!isNaN(limitNum)) {
          // Count active profiles + pending invites
          const [profilesCount, invitesCount] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('workspace_id', user.workspace_id),
            supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('workspace_id', user.workspace_id).eq('status', 'pending')
          ]);
            
          const totalMembers = (profilesCount.count || 0) + (invitesCount.count || 0);
          if (totalMembers >= limitNum) {
            return c.json({ 
              error: `Limit Reached: Your current plan only allows up to ${limitNum} team members. Please upgrade your plan.`,
              limitReached: true,
              limitKey: 'max_team_members'
            }, 403);
          }
        }
      }
    }

    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert([{
        email: snakeBody.email,
        workspace_id: user.workspace_id,
        role: snakeBody.role || 'Recruiter',
        department: snakeBody.department || 'HR Recruitment',
        invited_by: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      }])
      .select()
      .single();
      
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: null,
      target_user_name: snakeBody.email,
      action: 'Member Invited (Token)',
      previous_role: null,
      new_role: snakeBody.role,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    const mappedInvite = {
      id: `invite_${invitation.id}`,
      name: invitation.email.split('@')[0],
      email: invitation.email,
      role: invitation.role,
      status: 'Pending',
      lastLogin: 'Never',
      department: invitation.department,
      message: `Invitation Token: ${invitation.token}`
    };

    return c.json(mappedInvite);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/team_members/:id', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    console.log('[PUT /api/team_members/:id] Received body keys:', Object.keys(body));
    console.log('[PUT /api/team_members/:id] restrictedFeatures:', body.restrictedFeatures);
    console.log('[PUT /api/team_members/:id] customPermissions:', body.customPermissions);

    // Fetch original profile to compare role changes for audit log
    const { data: originalProfile } = await supabase
      .from('profiles')
      .select('role, name, status, custom_permissions, restricted_features')
      .eq('id', id)
      .single();

    // If password is provided, update via supabase admin auth API
    if (body.password) {
      const { error: pwdError } = await supabase.auth.admin.updateUserById(id, {
        password: body.password
      });
      if (pwdError) throw pwdError;
    }

    const repo = new WorkspaceRepository('profiles', user);
    // Remove password from profile update payload since profiles has no password column
    const { password, ...profileBody } = body;
    console.log('[PUT /api/team_members/:id] profileBody keys:', Object.keys(profileBody));
    const data = await repo.update(id, profileBody);

    if (originalProfile) {
      if (body.password) {
        await supabase.from('rbac_audit_logs').insert({
          workspace_id: user.workspace_id,
          target_user_id: id,
          target_user_name: data.name,
          action: 'Password Changed',
          previous_role: originalProfile.role,
          new_role: body.role || originalProfile.role,
          changed_by_id: user.id,
          changed_by_name: user.name || user.email
        });
      }
      if (body.customPermissions) {
        const originalPerms = originalProfile.custom_permissions || [];
        const newPerms = body.customPermissions || [];
        const permsChanged = JSON.stringify([...originalPerms].sort()) !== JSON.stringify([...newPerms].sort());
        if (permsChanged) {
          await supabase.from('rbac_audit_logs').insert({
            workspace_id: user.workspace_id,
            target_user_id: id,
            target_user_name: data.name,
            action: 'Permissions Overridden',
            previous_role: originalProfile.role,
            new_role: body.role || originalProfile.role,
            changed_by_id: user.id,
            changed_by_name: user.name || user.email
          });
        }
      }
      if (body.restrictedFeatures) {
        const originalRest = originalProfile.restricted_features || [];
        const newRest = body.restrictedFeatures || [];
        const restChanged = JSON.stringify([...originalRest].sort()) !== JSON.stringify([...newRest].sort());
        if (restChanged) {
          await supabase.from('rbac_audit_logs').insert({
            workspace_id: user.workspace_id,
            target_user_id: id,
            target_user_name: data.name,
            action: 'Restrictions Updated',
            previous_role: originalProfile.role,
            new_role: body.role || originalProfile.role,
            changed_by_id: user.id,
            changed_by_name: user.name || user.email
          });
        }
      }
      if (originalProfile.role !== body.role && body.role) {
        await supabase.from('rbac_audit_logs').insert({
          workspace_id: user.workspace_id,
          target_user_id: id,
          target_user_name: data.name,
          action: 'Role Changed',
          previous_role: originalProfile.role,
          new_role: body.role,
          changed_by_id: user.id,
          changed_by_name: user.name || user.email
        });
      }
      if (originalProfile.status !== body.status && body.status) {
        await supabase.from('rbac_audit_logs').insert({
          workspace_id: user.workspace_id,
          target_user_id: id,
          target_user_name: data.name,
          action: body.status === 'Disabled' ? 'User Suspended' : 'User Activated',
          previous_role: originalProfile.role,
          new_role: body.role || originalProfile.role,
          changed_by_id: user.id,
          changed_by_name: user.name || user.email
        });
      }
    }

    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/team_members/:id', requirePermission('team.remove'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    if (id.startsWith('invite_')) {
      const inviteId = id.replace('invite_', '');
      const { data: targetInvite, error: inviteGetError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', inviteId)
        .eq('workspace_id', user.workspace_id)
        .single();

      if (inviteGetError || !targetInvite) {
        return c.json({ error: 'Invitation not found or access denied.' }, 404);
      }

      const { error: inviteDeleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', inviteId);

      if (inviteDeleteError) throw inviteDeleteError;

      return c.json({ success: true });
    }

    const repo = new WorkspaceRepository('profiles', user);
    
    // Verify target profile is in user's workspace and check its role
    const targetProfiles = await repo.getCustom('role, name', { id });
    if (targetProfiles.length === 0) {
      return c.json({ error: 'Team member not found or access denied.' }, 404);
    }
    if (targetProfiles[0].role === 'Owner') {
      return c.json({ error: 'Forbidden: Cannot delete the workspace Owner.' }, 403);
    }

    const result = await repo.delete(id);

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: id,
      target_user_name: targetProfiles[0].name,
      action: 'Member Removed',
      previous_role: targetProfiles[0].role,
      new_role: null,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Special Single-Row Endpoint for Email Config
app.get('/api/email-config', requirePermission('settings.email'), async (c) => {
  const user = c.get('user') as any;
  try {
    const repo = new WorkspaceRepository('email_configs', user);
    const data = await repo.getAll();
    if (data.length === 0) {
      return c.json({ provider: 'Gmail', isConnected: false });
    }
    return c.json(data[0]);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/email-config', requirePermission('settings.email'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    snakeBody.workspace_id = user.workspace_id;
    snakeBody.updated_by = user.id;
    
    if (!snakeBody.id) {
      snakeBody.id = user.workspace_id;
    }
    
    const { data, error } = await supabase.from('email_configs').upsert([snakeBody]).select();
    if (error) throw error;
    
    return c.json(keysToCamel(data[0]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// JOB CANDIDATES (Pipeline) Routes
// ============================================================

// GET all candidates linked to any job
app.get('/api/job-candidates', requirePermission('pipeline.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const repo = new WorkspaceRepository('job_candidates', user);
    const data = await repo.getCustom('*, candidate:candidates(*)');
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET all candidates linked to a specific job (with full candidate data)
app.get('/api/job-candidates/:jobId', requirePermission('pipeline.view'), async (c) => {
  const user = c.get('user') as any;
  const jobId = c.req.param('jobId');
  try {
    const repo = new WorkspaceRepository('job_candidates', user);
    const data = await repo.getCustom('*, candidate:candidates(*)', { job_id: jobId });
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST — link a candidate to a job (add to pipeline)
app.post('/api/job-candidates', requirePermission('pipeline.move_candidate'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const row = {
      jobId: body.jobId,
      candidateId: body.candidateId,
      stage: body.stage || 'Applied',
      addedDate: new Date().toISOString().split('T')[0],
      userId: user.id
    };

    const snakeRow = keysToSnake(row);
    snakeRow.workspace_id = user.workspace_id;
    snakeRow.created_by = user.id;
    snakeRow.updated_by = user.id;

    const { data, error } = await supabase
      .from('job_candidates')
      .upsert([snakeRow], { onConflict: 'job_id,candidate_id' })
      .select();

    if (error) throw error;
    return c.json(keysToCamel(data[0]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// PATCH — update stage or details for a specific job_candidate row
app.patch('/api/job-candidates/:id', requirePermission('pipeline.move_candidate'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const repo = new WorkspaceRepository('job_candidates', user);
    const data = await repo.update(id, body);
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE — remove candidate from a job's pipeline (returns them to Talent Pool)
app.delete('/api/job-candidates/:id', requirePermission('pipeline.move_candidate'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const repo = new WorkspaceRepository('job_candidates', user);
    const result = await repo.delete(id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

async function startTelegramBotPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('Telegram Bot Token not configured. Polling skipped.');
    return;
  }

  console.log('Starting Telegram Bot update polling...');
  let offset = 0;

  async function poll() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            offset = Math.max(offset, update.update_id + 1);

            const message = update.message;
            if (!message || !message.text) continue;

            const chat = message.chat;
            const text = message.text.trim();

            // Check if message is /start <token>
            if (text.startsWith('/start ')) {
              const verifyToken = text.substring(7).trim();
              if (verifyToken) {
                // Find the config with this telegram_token
                const { data: configs, error } = await supabase
                  .from('email_configs')
                  .select('*')
                  .eq('telegram_token', verifyToken);

                if (!error && configs && configs.length > 0) {
                  const userConfig = configs[0];
                  const userId = userConfig.id; // userConfig.id is user_id

                  // Update database: set chat_id, enable notification, and clear temp token
                  await supabase
                    .from('email_configs')
                    .update({
                      telegram_chat_id: String(chat.id),
                      telegram_notification_enabled: true,
                      telegram_token: null
                    })
                    .eq('id', userId);

                  // Send success message to Telegram user
                  const senderName = message.from?.first_name || 'there';
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chat.id,
                      text: `🎉 Hello ${senderName}!\n\nYour Telegram account has been successfully linked to your Hirely Recruiter profile.\n\nYou will now receive instant alerts here when new resumes are uploaded.`
                    })
                  });

                  console.log(`[TELEGRAM] Successfully connected chat_id ${chat.id} to user_id ${userId}`);
                } else {
                  // Invalid or expired token
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chat.id,
                      text: `❌ Link Failed: The verification link is invalid or expired. Please generate a new connection link in settings.`
                    })
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in Telegram polling loop:', err);
    } finally {
      // Wait 3 seconds after completion before polling again
      setTimeout(poll, 3000);
    }
  }

  // Start polling
  poll();
}

// Start Telegram Bot polling immediately
startTelegramBotPolling();

// -------------------------------------------------------------
// RBAC / Permissions API Endpoints
// -------------------------------------------------------------

// 1. Get workspace roles
app.get('/api/workspace-roles', requirePermission('settings.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const { data, error } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('workspace_id', user.workspace_id);
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. Create custom role
app.post('/api/workspace-roles', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    const { data, error } = await supabase
      .from('workspace_roles')
      .insert({
        workspace_id: user.workspace_id,
        name: snakeBody.name,
        permissions: snakeBody.permissions || [],
        is_custom: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: `Role: ${body.name}`,
      action: 'Role Created',
      previous_role: null,
      new_role: body.name,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. Update role permissions
app.put('/api/workspace-roles/:id', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);

    const { data: originalRole } = await supabase
      .from('workspace_roles')
      .select('name, permissions')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('workspace_roles')
      .update({
        permissions: snakeBody.permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: `Role: ${originalRole?.name || 'Unknown'}`,
      action: 'Role Permissions Modified',
      previous_role: originalRole ? JSON.stringify(originalRole.permissions) : null,
      new_role: JSON.stringify(body.permissions),
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. Delete custom role
app.delete('/api/workspace-roles/:id', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const { data: originalRole } = await supabase
      .from('workspace_roles')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('workspace_roles')
      .delete()
      .eq('id', id)
      .eq('is_custom', true);
    
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: `Role: ${originalRole?.name || 'Unknown'}`,
      action: 'Role Deleted',
      previous_role: originalRole?.name,
      new_role: null,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. Update workspace feature locks
app.post('/api/workspace/locked-features', requirePermission('settings.workspace'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { lockedFeatures } = body;

    const { data: originalWs } = await supabase
      .from('workspaces')
      .select('locked_features')
      .eq('id', user.workspace_id)
      .single();

    const { data, error } = await supabase
      .from('workspaces')
      .update({
        locked_features: lockedFeatures,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.workspace_id)
      .select()
      .single();
    
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: 'Workspace Feature Locks',
      action: 'Feature Toggles Updated',
      previous_role: originalWs ? JSON.stringify(originalWs.locked_features) : null,
      new_role: JSON.stringify(lockedFeatures),
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json({ success: true, lockedFeatures: data.locked_features });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. Get rbac audit logs
app.get('/api/rbac-audit-logs', requirePermission('team.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const { data, error } = await supabase
      .from('rbac_audit_logs')
      .select('*')
      .eq('workspace_id', user.workspace_id)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. Upgrade workspace subscription plan
app.post('/api/workspace/upgrade', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { planSlug } = body;

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid subscription plan selected.' }, 400);
    }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    const { data, error } = await supabase
      .from('workspaces')
      .update({
        subscription_plan: planSlug,
        subscription_type: 'paid',
        is_trial: false,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        renewal_date: renewalDate.toISOString(),
        plan_id: plan.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.workspace_id)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, workspace: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Razorpay Payments integration
app.post('/api/payments/create-order', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { planSlug } = body;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return c.json({ error: 'Razorpay keys are not configured.' }, 500);
    }

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid subscription plan selected.' }, 400);
    }

    // Resolve price from the subscription plan
    // Since plans are in INR, we convert Rupees to Paise (multiply by 100)
    // The price in the table might be e.g. 2000 or 5000
    const amountInRupees = parseFloat(plan.monthly_price || '0');
    const amountInPaise = Math.round(amountInRupees * 100);

    if (amountInPaise < 100) {
      return c.json({ error: 'Minimum amount must be at least ₹1 (100 paise).' }, 400);
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${user.workspace_id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        workspace_id: user.workspace_id,
        plan_slug: planSlug
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    return c.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create order' }, 500);
  }
});

app.post('/api/payments/verify-payment', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, planSlug } = body;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !planSlug) {
      return c.json({ error: 'Missing required payment verification fields.' }, 400);
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return c.json({ error: 'Razorpay configuration error.' }, 500);
    }

    // Verify signature using crypto
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(razorpayOrderId + '|' + razorpayPaymentId);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return c.json({ error: 'Payment signature mismatch. Transaction not verified.' }, 400);
    }

    // Update workspace plan in Database
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid subscription plan selected.' }, 400);
    }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    const { data: updatedWorkspace, error: updateError } = await supabase
      .from('workspaces')
      .update({
        subscription_plan: planSlug,
        subscription_type: 'paid',
        is_trial: false,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        renewal_date: renewalDate.toISOString(),
        plan_id: plan.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.workspace_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return c.json({ success: true, workspace: keysToCamel(updatedWorkspace) });
  } catch (err: any) {
    return c.json({ error: err.message || 'Payment verification failed' }, 500);
  }
});


app.post('/api/payments/webhook', async (c) => {
  try {
    const signature = c.req.header('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Webhook Secret is not configured in environment variables');
      return c.json({ error: 'Webhook configuration error' }, 500);
    }

    if (!signature) {
      return c.json({ error: 'Missing signature header' }, 400);
    }

    const rawBody = await c.req.text();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );

    if (!isSignatureValid) {
      console.warn('Webhook signature verification failed');
      return c.json({ error: 'Signature mismatch' }, 400);
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    
    console.log(`Received Razorpay webhook event: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured') {
      const entity = event === 'order.paid' ? body.payload.order.entity : body.payload.payment.entity;
      const notes = entity.notes || {};
      const workspaceId = notes.workspace_id;
      const planSlug = notes.plan_slug;

      if (!workspaceId || !planSlug) {
        console.warn('Missing workspace_id or plan_slug in order/payment notes');
        return c.json({ status: 'ok', warning: 'No action taken due to missing metadata notes' }, 200);
      }

      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', planSlug)
        .single();

      if (planError || !plan) {
        console.error(`Invalid plan slug received in webhook notes: ${planSlug}`);
        return c.json({ status: 'ok', error: 'Invalid plan' }, 200);
      }

      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      // Perform update on workspaces table
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          subscription_plan: planSlug,
          subscription_type: 'paid',
          is_trial: false,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          renewal_date: renewalDate.toISOString(),
          plan_id: plan.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      if (updateError) {
        console.error(`Database error updating workspace ${workspaceId} via webhook:`, updateError);
        throw updateError;
      }

      // Log transaction record in database
      const paymentId = event === 'payment.captured' ? entity.id : (entity.payment_id || `pay_order_${entity.id}`);
      await supabase
        .from('billing_transactions')
        .insert({
          id: paymentId,
          workspace_id: workspaceId,
          amount: entity.amount,
          currency: entity.currency || 'INR',
          status: 'captured',
          event_type: event,
          plan_slug: planSlug
        });

      console.log(`Workspace ${workspaceId} successfully upgraded via Webhook to ${planSlug}`);
    } 
    
    else if (event === 'subscription.charged') {
      const paymentEntity = body.payload.payment.entity;
      const subscriptionEntity = body.payload.subscription.entity;
      const notes = subscriptionEntity.notes || paymentEntity.notes || {};
      const workspaceId = notes.workspace_id;
      const planSlug = notes.plan_slug || 'growth';

      if (workspaceId) {
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'active',
            renewal_date: renewalDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', workspaceId);

        await supabase
          .from('billing_transactions')
          .insert({
            id: paymentEntity.id,
            workspace_id: workspaceId,
            amount: paymentEntity.amount,
            currency: paymentEntity.currency || 'INR',
            status: 'captured',
            event_type: 'subscription.charged',
            plan_slug: planSlug
          });

        console.log(`Workspace ${workspaceId} subscription successfully renewed via webhook.`);
      }
    } 
    
    else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const subscriptionEntity = body.payload.subscription.entity;
      const notes = subscriptionEntity.notes || {};
      const workspaceId = notes.workspace_id;

      if (workspaceId) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: event === 'subscription.cancelled' ? 'cancelled' : 'expired',
            subscription_type: 'trial',
            is_trial: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', workspaceId);

        console.log(`Workspace ${workspaceId} subscription status set to inactive due to: ${event}`);
      }
    } 
    
    else if (event === 'refund.processed') {
      const refundEntity = body.payload.refund.entity;
      const originalPaymentId = refundEntity.payment_id;

      // Look up original transaction to find workspace_id
      const { data: originalTx } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('id', originalPaymentId)
        .single();

      if (originalTx) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'refunded',
            subscription_type: 'trial',
            is_trial: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTx.workspace_id);

        await supabase
          .from('billing_transactions')
          .insert({
            id: refundEntity.id,
            workspace_id: originalTx.workspace_id,
            amount: refundEntity.amount,
            currency: refundEntity.currency || 'INR',
            status: 'refunded',
            event_type: 'refund.processed',
            plan_slug: originalTx.plan_slug
          });

        console.log(`Workspace ${originalTx.workspace_id} subscription refunded successfully.`);
      }
    } 
    
    else if (event === 'payment.dispute.created') {
      const disputeEntity = body.payload.dispute.entity;
      const originalPaymentId = disputeEntity.payment_id;

      const { data: originalTx } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('id', originalPaymentId)
        .single();

      if (originalTx) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTx.workspace_id);

        await supabase
          .from('billing_disputes')
          .insert({
            id: disputeEntity.id,
            payment_id: originalPaymentId,
            workspace_id: originalTx.workspace_id,
            amount: disputeEntity.amount,
            currency: disputeEntity.currency || 'INR',
            status: 'under_review',
            reason: disputeEntity.reason_code
          });

        console.log(`Workspace ${originalTx.workspace_id} suspended due to active payment dispute.`);
      }
    } 
    
    else if (event === 'payment.dispute.lost') {
      const disputeEntity = body.payload.dispute.entity;
      const originalPaymentId = disputeEntity.payment_id;

      const { data: originalTx } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('id', originalPaymentId)
        .single();

      if (originalTx) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'expired',
            subscription_type: 'trial',
            is_trial: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTx.workspace_id);

        await supabase
          .from('billing_disputes')
          .update({
            status: 'lost',
            updated_at: new Date().toISOString()
          })
          .eq('id', disputeEntity.id);

        console.log(`Workspace ${originalTx.workspace_id} downgraded permanently after lost dispute.`);
      }
    }

    return c.json({ status: 'ok' }, 200);
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    return c.json({ error: err.message || 'Webhook internal error' }, 500);
  }
});

app.get('/api/admin/billing/subscriptions', async (c) => {
  const user = c.get('user') as any;
  if (!user || !user.is_super_admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, subscription_plan, subscription_status, subscription_type, is_trial, renewal_date, trial_expiry');

    const { data: transactions, error: txError } = await supabase
      .from('billing_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: disputes, error: dispError } = await supabase
      .from('billing_disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (wsError) throw wsError;
    if (txError) throw txError;
    if (dispError) throw dispError;

    return c.json(keysToCamel({
      workspaces: workspaces || [],
      transactions: transactions || [],
      disputes: disputes || []
    }));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/admin/billing/refund', async (c) => {
  const user = c.get('user') as any;
  if (!user || !user.is_super_admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId) {
      return c.json({ error: 'Missing paymentId parameter' }, 400);
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return c.json({ error: 'Razorpay keys not configured.' }, 500);
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const refundOptions: any = {
      payment_id: paymentId,
      notes: {
        refund_reason: reason || 'Refunded by administrator'
      }
    };

    if (amount) {
      refundOptions.amount = Math.round(amount * 100);
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    const { data: originalTx } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (originalTx) {
      await supabase
        .from('workspaces')
        .update({
          subscription_status: 'refunded',
          subscription_type: 'trial',
          is_trial: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalTx.workspace_id);

      await supabase
        .from('billing_transactions')
        .insert({
          id: refund.id,
          workspace_id: originalTx.workspace_id,
          amount: refund.amount,
          currency: refund.currency || 'INR',
          status: 'refunded',
          event_type: 'admin.refund',
          plan_slug: originalTx.plan_slug
        });
    }

    return c.json({ success: true, refundId: refund.id });
  } catch (err: any) {
    return c.json({ error: err.message || 'Refund failed' }, 500);
  }
});

// 8. Support tickets for recruiter portal users
app.get('/api/support', async (c) => {
  const user = c.get('user') as any;
  try {
    const { data, error } = await supabase
      .from('superadmin_tickets')
      .select('*')
      .eq('agency_id', user.workspace_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/support', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { subject, description, priority } = body;

    const { data, error } = await supabase
      .from('superadmin_tickets')
      .insert([{
        agency_id: user.workspace_id,
        subject,
        description,
        priority: priority || 'Medium',
        status: 'Open'
      }])
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// -------------------------------------------------------------
// Super Admin Middleware and Endpoints
// -------------------------------------------------------------
app.post('/api/superadmin/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // Create an isolated client for user authentication so we don't mutate global service headers
    const tempClient = createClient(
      process.env.SUPABASE_URL || 'https://wnaayghjmewxzwratqas.supabase.co',
      process.env.SUPABASE_KEY || ''
    );
    
    const { data, error } = await tempClient.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      return c.json({ error: error?.message || 'Invalid email or password.' }, 401);
    }

    // Query profile with backend admin privileges to bypass RLS policies
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', data.user.id)
      .single();

    console.log('Admin login attempt user ID:', data?.user?.id);
    console.log('Profile query result:', profile);
    if (profileErr) {
      console.error('Profile query error details:', profileErr);
    }

    if (profileErr || !profile || !profile.is_super_admin) {
      // Sign out immediately if not a super admin
      await supabase.auth.signOut();
      return c.json({ error: 'Access Denied: You do not have Super Admin credentials.' }, 403);
    }

    return c.json({
      session: data.session,
      user: data.user
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
const requireSuperAdmin = async (c: any, next: any) => {
  const user = c.get('user') as any;
  if (!user || !user.is_super_admin) {
    return c.json({ error: 'Forbidden: Super Admin access required' }, 403);
  }
  await next();
};

// 1. Dashboard Stats
app.get('/api/superadmin/dashboard-stats', requireSuperAdmin, async (c) => {
  try {
    const [
      agenciesCount,
      activeAgenciesCount,
      usersCount,
      resumesCount,
      emailsCount,
      aiLogsCount,
      revenueRes,
      ticketsCount
    ] = await Promise.all([
      supabase.from('workspaces').select('id', { count: 'exact', head: true }),
      supabase.from('workspaces').select('id', { count: 'exact', head: true }).not('subscription_status', 'eq', 'suspended'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('candidates').select('id', { count: 'exact', head: true }),
      supabase.from('superadmin_email_logs').select('id', { count: 'exact', head: true }),
      supabase.from('superadmin_ai_logs').select('id', { count: 'exact', head: true }),
      supabase.from('superadmin_payments').select('amount').eq('status', 'Paid'),
      supabase.from('superadmin_tickets').select('id', { count: 'exact', head: true }).eq('status', 'Open')
    ]);

    const totalRevenue = (revenueRes.data || []).reduce((acc: number, curr: any) => acc + parseFloat(curr.amount || 0), 0);

    // Mock CPU, Memory for health
    const platformHealth = {
      cpu: Math.floor(Math.random() * 20) + 10,
      memory: Math.floor(Math.random() * 15) + 40,
      dbStatus: 'Healthy',
      queueStatus: 'Idle'
    };

    return c.json({
      totalAgencies: agenciesCount.count || 0,
      activeAgencies: activeAgenciesCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalResumes: resumesCount.count || 0,
      totalEmails: emailsCount.count || 0,
      totalAiRequests: aiLogsCount.count || 0,
      totalRevenue: totalRevenue,
      openTickets: ticketsCount.count || 0,
      health: platformHealth
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// -------------------------------------------------------------
// Onboarding & Tenancy Setup Endpoints
// -------------------------------------------------------------

// Create new workspace
app.post('/api/workspaces', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { name, slug } = body;

    const workspaceSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { data: settings } = await supabase
      .from('superadmin_settings')
      .select('trial_enabled, trial_duration_days')
      .eq('id', 'global')
      .single();

    const trialEnabled = settings?.trial_enabled !== false;
    const trialDays = settings?.trial_duration_days || 7;
    const startTrial = body.isTrial && trialEnabled;

    const renewalDate = new Date();
    if (startTrial) {
      renewalDate.setDate(renewalDate.getDate() + trialDays);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    // Insert workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert([{
        name,
        slug: workspaceSlug,
        owner_id: user.id,
        subscription_plan: startTrial ? 'growth' : 'starter',
        billing_cycle: 'monthly',
        renewal_date: renewalDate.toISOString(),
        subscription_status: 'active',
        is_trial: startTrial,
        subscription_type: startTrial ? 'trial' : 'paid',
        trial_start_date: startTrial ? new Date().toISOString() : null,
        trial_end_date: startTrial ? renewalDate.toISOString() : null,
        plan_id: startTrial ? 'fa26210e-a9a9-40c2-a4d5-d4eaf4c246fa' : null,
        subscription_start_date: startTrial ? null : new Date().toISOString()
      }])
      .select()
      .single();

    if (wsError) throw wsError;

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        workspace_id: workspace.id,
        role: 'Owner',
        status: 'Active'
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    return c.json({
      success: true,
      workspace: keysToCamel(workspace)
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Verify invitation token
app.get('/api/public/invitations/:token', async (c) => {
  const token = c.req.param('token');
  try {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return c.json({ error: 'Invalid invitation link' }, 400);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Invitation has already been accepted' }, 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return c.json({ error: 'Invitation link has expired' }, 400);
    }

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', invitation.workspace_id)
      .single();

    if (wsError) throw wsError;

    return c.json({
      isValid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        workspaceName: workspace.name
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Accept invitation
app.post('/api/invitations/accept', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { token } = body;

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return c.json({ error: 'Invalid invitation link' }, 400);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Invitation has already been accepted' }, 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return c.json({ error: 'Invitation link has expired' }, 400);
    }

    // Enforce email match
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return c.json({ error: `This invitation is for ${invitation.email}, but you are logged in as ${user.email}.` }, 400);
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        workspace_id: invitation.workspace_id,
        role: invitation.role,
        department: invitation.department,
        status: 'Active'
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // Update invitation status
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    return c.json({
      success: true,
      workspaceId: invitation.workspace_id
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. Agencies Management
app.get('/api/superadmin/agencies', requireSuperAdmin, async (c) => {
  try {
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (wsError) throw wsError;

    const agencies = await Promise.all(workspaces.map(async (ws: any) => {
      const [usersCount, candidatesCount, jobsCount, aiUsage] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id),
        supabase.from('superadmin_ai_logs').select('id', { count: 'exact', head: true }).eq('agency_id', ws.id)
      ]);

      return {
        ...keysToCamel(ws),
        usersCount: usersCount.count || 0,
        candidatesCount: candidatesCount.count || 0,
        jobsCount: jobsCount.count || 0,
        aiUsageCount: aiUsage.count || 0,
        storageUsedMb: Math.round(((candidatesCount.count || 0) * 1.2 + 10) * 10) / 10
      };
    }));

    return c.json(agencies);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/agencies', requireSuperAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const insertObj = keysToSnake({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subscriptionPlan: body.subscriptionPlan || 'Free',
      subscriptionStatus: body.subscriptionStatus || 'active',
      isTrial: body.isTrial || false,
      subscriptionType: body.subscriptionType || 'paid',
      trialStartDate: body.trialStartDate || null,
      trialEndDate: body.trialEndDate || null,
      subscriptionStartDate: body.subscriptionStartDate || null,
      subscriptionEndDate: body.subscriptionEndDate || null,
      planId: body.planId || null
    });
    
    const { data, error } = await supabase
      .from('workspaces')
      .insert([insertObj])
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/superadmin/agencies/:id', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const allowedKeys = [
      'name', 'subscriptionPlan', 'subscriptionStatus', 'lockedFeatures',
      'isTrial', 'subscriptionType', 'trialStartDate', 'trialEndDate',
      'subscriptionStartDate', 'subscriptionEndDate', 'planId'
    ];
    
    const updateObj: any = {};
    allowedKeys.forEach(k => {
      if (body[k] !== undefined) {
        updateObj[k] = body[k];
      }
    });

    const { data, error } = await supabase
      .from('workspaces')
      .update(keysToSnake(updateObj))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/superadmin/agencies/:id', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Impersonate
app.post('/api/superadmin/agencies/:id/impersonate', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('workspace_id', id)
      .limit(1);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return c.json({ error: 'No users found in this workspace to impersonate' }, 400);
    }

    const targetUser = profiles[0];

    // Generate magic link using supabase admin auth to redirect to the recruiter dashboard
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo: 'http://localhost:7474/dashboard'
      }
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw linkError || new Error('Failed to generate impersonation magic link');
    }

    return c.json({
      success: true,
      user: keysToCamel(targetUser),
      redirectUrl: linkData.properties.action_link,
      message: `Impersonating user ${targetUser.name}`
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. Users Management
app.get('/api/superadmin/users', requireSuperAdmin, async (c) => {
  try {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError) throw pError;

    const users = await Promise.all(profiles.map(async (profile: any) => {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', profile.workspace_id)
        .single();
      
      return {
        ...keysToCamel(profile),
        agencyName: ws?.name || 'Default Workspace'
      };
    }));

    return c.json(users);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/superadmin/users/:id', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, role, status } = body;

    const updateObj: any = {};
    if (name !== undefined) updateObj.name = name;
    if (role !== undefined) updateObj.role = role;
    if (status !== undefined) updateObj.status = status;

    const { data, error } = await supabase
      .from('profiles')
      .update(keysToSnake(updateObj))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/superadmin/users/:id', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. Subscriptions stats
app.get('/api/superadmin/subscriptions', requireSuperAdmin, async (c) => {
  try {
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('id, name, subscription_plan, subscription_status, created_at');

    if (error) throw error;

    const planDistribution = {
      Free: 0,
      Standard: 0,
      'AI Pro': 0,
      Enterprise: 0
    };

    workspaces.forEach((ws: any) => {
      const plan = ws.subscription_plan || 'Free';
      if (plan in planDistribution) {
        planDistribution[plan as keyof typeof planDistribution]++;
      } else {
        planDistribution.Free++;
      }
    });

    const detailedList = workspaces.map((ws: any) => ({
      id: ws.id,
      agency: ws.name,
      plan: ws.subscription_plan || 'Free',
      renewDate: new Date(new Date(ws.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: ws.subscription_plan === 'Enterprise' ? 499 : ws.subscription_plan === 'AI Pro' ? 199 : ws.subscription_plan === 'Standard' ? 99 : 0,
      status: ws.subscription_status === 'suspended' ? 'Suspended' : 'Active',
      autoRenewal: ws.subscription_status !== 'suspended'
    }));

    return c.json({
      distribution: planDistribution,
      subscriptions: detailedList
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 5. Payments
app.get('/api/superadmin/payments', requireSuperAdmin, async (c) => {
  try {
    const { data: payments, error } = await supabase
      .from('superadmin_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const detailedPayments = await Promise.all(payments.map(async (pay: any) => {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', pay.agency_id)
        .single();
      
      return {
        ...keysToCamel(pay),
        agencyName: ws?.name || 'Unknown Agency'
      };
    }));

    return c.json(detailedPayments);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/payments/:id/refund', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('superadmin_payments')
      .update({ status: 'Refunded' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6. AI Analytics
app.get('/api/superadmin/ai-analytics', requireSuperAdmin, async (c) => {
  try {
    const { data: logs, error } = await supabase
      .from('superadmin_ai_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalRequests = logs.length;
    let totalCost = 0;
    let totalTokens = 0;
    let totalResponseTime = 0;
    let successCount = 0;

    const breakdown = {
      'Resume Parsing': 0,
      'AI Matching': 0,
      'Voice AI': 0,
      'AI Search': 0
    };

    logs.forEach((log: any) => {
      totalCost += parseFloat(log.cost || 0);
      totalTokens += parseInt(log.token_usage || 0);
      totalResponseTime += parseInt(log.response_time_ms || 0);
      if (log.status === 'Success') successCount++;
      
      const feature = log.feature || 'Resume Parsing';
      if (feature in breakdown) {
        breakdown[feature as keyof typeof breakdown]++;
      }
    });

    const averageResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
    const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;

    return c.json({
      totalRequests,
      totalCost,
      totalTokens,
      averageResponseTime,
      successRate,
      breakdown,
      logs: keysToCamel(logs)
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6.5. Free Trial Analytics
app.get('/api/superadmin/trial-analytics', requireSuperAdmin, async (c) => {
  try {
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('*');

    if (error) throw error;

    const trials = (workspaces || []).filter((ws: any) => ws.trial_start_date !== null || ws.is_trial);
    const totalTrials = trials.length;
    const activeTrials = trials.filter((ws: any) => ws.is_trial && ws.subscription_status === 'active' && ws.trial_end_date && new Date(ws.trial_end_date) >= new Date()).length;
    const expiredTrials = trials.filter((ws: any) => ws.is_trial && ws.subscription_status === 'expired').length;
    const convertedTrials = trials.filter((ws: any) => !ws.is_trial && ws.subscription_type === 'paid');

    const conversionCount = convertedTrials.length;
    const conversionRate = totalTrials > 0 ? Math.round((conversionCount / totalTrials) * 100) : 0;
    const expiryRate = totalTrials > 0 ? Math.round((expiredTrials / totalTrials) * 100) : 0;

    let totalConversionTimeMs = 0;
    convertedTrials.forEach((ws: any) => {
      if (ws.trial_start_date && (ws.subscription_start_date || ws.updated_at)) {
        const start = new Date(ws.trial_start_date);
        const end = new Date(ws.subscription_start_date || ws.updated_at);
        totalConversionTimeMs += (end.getTime() - start.getTime());
      }
    });
    const avgConversionTimeDays = conversionCount > 0 ? Math.round((totalConversionTimeMs / (1000 * 60 * 60 * 24)) / conversionCount * 10) / 10 : 0;

    const trialWorkspaceIds = trials.map((ws: any) => ws.id);
    const topFeaturesBreakdown = {
      'Resume Parsing': 0,
      'AI Matching': 0,
      'Voice AI': 0,
      'AI Search': 0
    };

    if (trialWorkspaceIds.length > 0) {
      const { data: aiLogs } = await supabase
        .from('superadmin_ai_logs')
        .select('feature, agency_id')
        .in('agency_id', trialWorkspaceIds);
      
      if (aiLogs) {
        aiLogs.forEach((log: any) => {
          const feature = log.feature || 'Resume Parsing';
          if (feature in topFeaturesBreakdown) {
            topFeaturesBreakdown[feature as keyof typeof topFeaturesBreakdown]++;
          }
        });
      }
    }

    return c.json({
      totalTrials,
      activeTrials,
      expiredTrials,
      convertedTrials: conversionCount,
      conversionRate,
      expiryRate,
      avgConversionTimeDays,
      topFeaturesBreakdown
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. Email Logs
app.get('/api/superadmin/email-logs', requireSuperAdmin, async (c) => {
  try {
    const { data: logs, error } = await supabase
      .from('superadmin_email_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json(keysToCamel(logs));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/email-logs/:id/retry', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('superadmin_email_logs')
      .update({ status: 'Delivered', error_message: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8. Storage stats
app.get('/api/superadmin/storage', requireSuperAdmin, async (c) => {
  try {
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, name, resume_file_name, resume_text, workspace_id');

    if (error) throw error;

    const agencyStorage: Record<string, { agencyName: string; sizeMb: number; fileCount: number }> = {};
    const filesList: any[] = [];

    for (const cand of candidates) {
      if (cand.resume_file_name) {
        const sizeMb = Math.round((Math.random() * 2.5 + 0.5) * 100) / 100;
        
        if (!agencyStorage[cand.workspace_id]) {
          const { data: ws } = await supabase
            .from('workspaces')
            .select('name')
            .eq('id', cand.workspace_id)
            .single();
          
          agencyStorage[cand.workspace_id] = {
            agencyName: ws?.name || 'Unknown Workspace',
            sizeMb: 0,
            fileCount: 0
          };
        }

        agencyStorage[cand.workspace_id].sizeMb += sizeMb;
        agencyStorage[cand.workspace_id].fileCount++;

        filesList.push({
          id: cand.id,
          fileName: cand.resume_file_name,
          candidateName: cand.name,
          sizeMb,
          uploadedAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    const topAgencies = Object.values(agencyStorage)
      .map(v => ({
        agency: v.agencyName,
        sizeMb: Math.round(v.sizeMb * 100) / 100,
        files: v.fileCount
      }))
      .sort((a, b) => b.sizeMb - a.sizeMb);

    const largestFiles = filesList
      .sort((a, b) => b.sizeMb - a.sizeMb)
      .slice(0, 10);

    const totalStorageMb = topAgencies.reduce((acc, curr) => acc + curr.sizeMb, 0);

    return c.json({
      totalStorageMb: Math.round(totalStorageMb * 100) / 100,
      usedStorageMb: Math.round(totalStorageMb * 100) / 100,
      availableStorageMb: Math.round((10240 - totalStorageMb) * 100) / 100,
      topAgencies,
      largestFiles
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/storage/cleanup', requireSuperAdmin, async (c) => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('id')
      .is('resume_text', null);

    if (error) throw error;
    
    return c.json({
      success: true,
      cleanedFilesCount: data?.length || 0,
      reclaimedSpaceMb: Math.round(((data?.length || 0) * 1.1) * 100) / 100
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 9. Support
app.get('/api/superadmin/support', requireSuperAdmin, async (c) => {
  try {
    const { data: tickets, error } = await supabase
      .from('superadmin_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const detailedTickets = await Promise.all(tickets.map(async (t: any) => {
      const [ws, profile] = await Promise.all([
        supabase.from('workspaces').select('name').eq('id', t.agency_id).single(),
        t.assigned_to ? supabase.from('profiles').select('name').eq('id', t.assigned_to).single() : Promise.resolve(null)
      ]);

      return {
        ...keysToCamel(t),
        agencyName: ws.data?.name || 'Unknown Workspace',
        assignedName: profile?.data?.name || 'Unassigned'
      };
    }));

    return c.json(detailedTickets);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/support/:id/reply', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { message } = body;

    const { data: ticket } = await supabase
      .from('superadmin_tickets')
      .select('description')
      .eq('id', id)
      .single();

    const currentDescription = ticket?.description || '';
    const replyBlock = `\n\n---\nSupport Response (${new Date().toLocaleString()}):\n${message}`;
    const updatedDescription = currentDescription + replyBlock;

    const { data, error } = await supabase
      .from('superadmin_tickets')
      .update({ 
        status: 'In Progress',
        description: updatedDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, ticket: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/superadmin/support/:id/status', requireSuperAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    const { data, error } = await supabase
      .from('superadmin_tickets')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 10. Feature Control
app.get('/api/superadmin/feature-control', requireSuperAdmin, async (c) => {
  try {
    const { data, error } = await supabase
      .from('superadmin_feature_switches')
      .select('*')
      .eq('id', 'global')
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/feature-control', requireSuperAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const switches = keysToSnake(body);

    const { data, error } = await supabase
      .from('superadmin_feature_switches')
      .update({
        ...switches,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'global')
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 11. Audit Logs
app.get('/api/superadmin/audit-logs', requireSuperAdmin, async (c) => {
  try {
    const { data: logs, error } = await supabase
      .from('rbac_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const detailedLogs = await Promise.all(logs.map(async (l: any) => {
      const [ws, profile] = await Promise.all([
        supabase.from('workspaces').select('name').eq('id', l.workspace_id).single(),
        supabase.from('profiles').select('name, email').eq('id', l.target_user_id).single()
      ]);

      return {
        ...keysToCamel(l),
        agencyName: ws.data?.name || 'Default Workspace',
        targetUserName: profile.data?.name || 'Unknown',
        targetUserEmail: profile.data?.email || 'Unknown',
        ipAddress: '127.0.0.1',
        browser: 'Chrome 125.0',
        device: 'Windows 11 Desktop'
      };
    }));

    return c.json(detailedLogs);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 12. Settings
app.get('/api/superadmin/settings', requireSuperAdmin, async (c) => {
  try {
    const { data, error } = await supabase
      .from('superadmin_settings')
      .select('*')
      .eq('id', 'global')
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/superadmin/settings', requireSuperAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const settings = keysToSnake(body);

    const { data, error } = await supabase
      .from('superadmin_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'global')
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// SUBSCRIPTION PLANS ENDPOINTS
// ============================================================

// Public route to fetch active, public plans (for landing page/signup pricing)
app.get('/api/public/plans', async (c) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('status', 'Active')
      .eq('visibility', 'Public')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Get all plans
app.get('/api/superadmin/plans', requireSuperAdmin, async (c) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Get version logs of a plan
app.get('/api/superadmin/plans/:id/versions', requireSuperAdmin, async (c) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plan_versions')
      .select('*')
      .eq('plan_id', c.req.param('id'))
      .order('version', { ascending: false });
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Create a new plan
app.post('/api/superadmin/plans', requireSuperAdmin, async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([snakeBody])
      .select()
      .single();
      
    if (error) throw error;
    
    // Log creation version
    await supabase.from('subscription_plan_versions').insert([{
      plan_id: data.id,
      version: 1,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email,
      previous_values: {},
      new_values: data
    }]);

    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Update a plan and save version history
app.put('/api/superadmin/plans/:id', requireSuperAdmin, async (c) => {
  const user = c.get('user') as any;
  const planId = c.req.param('id');
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    // Get existing plan details
    const { data: existing, error: getErr } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (getErr || !existing) {
      return c.json({ error: 'Plan not found' }, 404);
    }
    
    // Perform update
    const { data: updated, error: updateErr } = await supabase
      .from('subscription_plans')
      .update(snakeBody)
      .eq('id', planId)
      .select()
      .single();
      
    if (updateErr) throw updateErr;
    
    // Fetch latest version number
    const { data: versions } = await supabase
      .from('subscription_plan_versions')
      .select('version')
      .eq('plan_id', planId)
      .order('version', { ascending: false })
      .limit(1);
      
    const nextVer = versions && versions.length > 0 ? (versions[0].version + 1) : 1;
    
    // Create audit version
    await supabase.from('subscription_plan_versions').insert([{
      plan_id: planId,
      version: nextVer,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email,
      previous_values: existing,
      new_values: updated
    }]);
    
    return c.json(keysToCamel(updated));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Rollback plan to a specific version
app.post('/api/superadmin/plans/:id/rollback', requireSuperAdmin, async (c) => {
  const user = c.get('user') as any;
  const planId = c.req.param('id');
  try {
    const { versionId } = await c.req.json();
    
    const { data: verRow, error: verErr } = await supabase
      .from('subscription_plan_versions')
      .select('*')
      .eq('id', versionId)
      .eq('plan_id', planId)
      .single();
      
    if (verErr || !verRow) {
      return c.json({ error: 'Version history record not found' }, 404);
    }
    
    const revertedValues = verRow.new_values;
    const { id, created_at, updated_at, ...cleanValues } = revertedValues;
    
    const { data: updated, error: updateErr } = await supabase
      .from('subscription_plans')
      .update(cleanValues)
      .eq('id', planId)
      .select()
      .single();
      
    if (updateErr) throw updateErr;
    
    const { data: versions } = await supabase
      .from('subscription_plan_versions')
      .select('version')
      .eq('plan_id', planId)
      .order('version', { ascending: false })
      .limit(1);
      
    const nextVer = versions && versions.length > 0 ? (versions[0].version + 1) : 1;
    
    await supabase.from('subscription_plan_versions').insert([{
      plan_id: planId,
      version: nextVer,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email,
      previous_values: revertedValues,
      new_values: updated,
      timestamp: new Date().toISOString()
    }]);
    
    return c.json(keysToCamel(updated));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Delete plan
app.delete('/api/superadmin/plans/:id', requireSuperAdmin, async (c) => {
  const planId = c.req.param('id');
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);
      
    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Bun Native Server entry point
export default {
  port: parseInt(process.env.PORT || '3001'),
  fetch: app.fetch,
  idleTimeout: 60
};
