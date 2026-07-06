import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabase } from './db';
import { keysToCamel, keysToSnake } from './utils';
import { WorkspaceRepository } from './repository';
import dotenv from 'dotenv';
import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';


dotenv.config();

const app = new Hono<{
  Variables: {
    user: any;
  }
}>();

// Enable CORS for frontend
app.use('/*', cors({
  origin: '*', // We can restrict this to the frontend URL if needed
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// Memory store for background LLM tasks
export interface BackgroundTask {
  status: 'pending' | 'completed' | 'failed' | 'pending_approval';
  result?: any;
  error?: string;
  user?: any;
}

export const backgroundTasks = new Map<string, BackgroundTask>();

// Task Status polling endpoint
app.get('/api/ai/task-status/:id', (c) => {
  const taskId = c.req.param('id');
  const task = backgroundTasks.get(taskId);
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }
  return c.json(task);
});

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

const requirePermission = (permission: string) => {
  return async (c: any, next: any) => {
    const user = c.get('user') as any;
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roleLower = (user.role || '').toLowerCase();

    // 1. Check member-level feature restrictions
    const restrictedFeatures = user.restricted_features || [];
    if (roleLower !== 'owner' && isFeatureLocked(permission, restrictedFeatures)) {
      return c.json({ error: 'Feature Disabled by Administrator' }, 403);
    }

    // 2. Check global workspace locks
    const lockedFeatures = user.locked_features || [];
    if (roleLower !== 'owner' && roleLower !== 'admin') {
      if (isFeatureLocked(permission, lockedFeatures)) {
        return c.json({ error: 'Feature Disabled by Administrator' }, 403);
      }
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
  if (c.req.path === '/api/health') {
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

  // Fetch profiles to retrieve workspace_id, role, name, email, custom_permissions, restricted_features
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_id, role, name, email, custom_permissions, restricted_features')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.workspace_id) {
    return c.json({ error: 'Unauthorized: User workspace profile not found' }, 403);
  }

  // Fetch workspace locked features
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('locked_features')
    .eq('id', profile.workspace_id)
    .single();

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
    restricted_features: profile.restricted_features || []
  });
  await next();
});

// -------------------------------------------------------------
// AI Endpoints
// -------------------------------------------------------------

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

    if (!isPdf && !isTxt) {
      return c.json({ error: `Unsupported file format: ${mimeType || 'unknown'}. Only PDF and TXT are supported.` }, 400);
    }

    const taskId = 'task_parse_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    backgroundTasks.set(taskId, { status: 'pending' });

    // Run parsing in background
    (async () => {
      try {
        console.log("--- START PARSE RESUME ---");
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

        if (isPdf && textContent.trim().length === 0) {
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
        console.log("--- END PARSE RESUME ---");
        backgroundTasks.set(taskId, { status: 'completed', result: { data: parsedData } });
      } catch (err: any) {
        console.error('Error in background parse-resume task:', err.message);
        backgroundTasks.set(taskId, { status: 'failed', error: err.message });
      }
    })();

    return c.json({ taskId, status: 'pending' });
  } catch (err: any) {
    console.error('Error in parse-resume:', err.message);
    return c.json({
      error: 'Failed to initiate resume parsing.',
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
    const mimeType = file.type;
    const isPdf = mimeType === 'application/pdf' || file.name.endsWith('.pdf');
    
    let textContent = '';
    
    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const result = await extractText(pdf);
      textContent = typeof result === 'string' ? result : (result as any).text?.join('\n') || '';
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
              stage: { type: 'string', description: 'Candidate stage (e.g. Applied, Shortlisted, Interviewing, Selected, Rejected)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_candidate_resume',
          description: 'Fetches the detailed resume text and parsed data for a single candidate by their ID.',
          parameters: {
            type: 'object',
            properties: {
              candidate_id: { type: 'string', description: 'The unique ID of the candidate.' }
            },
            required: ['candidate_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_active_jobs',
          description: 'Returns a summary list of all active jobs in the workspace (ID, title, department, status, location, etc.).',
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
          description: 'Returns a summary list of all registered corporate partner companies (ID, name, industry, website).',
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
      }
    ];

    const systemInstruction = `You are a helpful, professional AI Recruiter Assistant called Copilot.
You assist the recruiter in managing candidates, jobs, companies, tasks, and templates.

Instead of having all data pre-loaded, you have ACCESS to live tools to search the database. You MUST use these tools whenever you need information to answer user queries:
- Use 'search_candidates' to find candidates matching search queries, skills, or stages.
- Use 'get_candidate_resume' to fetch the parsed resume text for a candidate.
- Use 'list_active_jobs' to check jobs.
- Use 'list_companies' to check companies.
- Use 'get_workspace_tasks' to check tasks.
- Use 'get_custom_field_definitions' to check what dynamic custom fields (like charges, current salary, etc.) are available in this workspace.

Always perform candidate search or lookup first before answering! Only request candidate resumes if explicitly asked to read, summarize, or evaluate details of a candidate.

DATABASE WRITE ACTIONS:
If the user asks you to write, add, create, delete, or update any information (e.g., adding, modifying, or deleting a candidate, job, company, task, or email template), you MUST append a JSON action block at the very end of your response, wrapped in <action>...</action> tags.
Do NOT output this action block to the user in conversational text—the system will intercept and execute it. 
Here are the supported commands and their payload schemas:

1. Company Commands:
- Create Company:
<action>
{
  "command": "create_company",
  "data": {
    "name": "Company Name",
    "contactPerson": "Contact Person Name",
    "status": "Active | Inactive",
    "email": "company@example.com",
    "phone": "Phone Number",
    "website": "http://example.com",
    "address": "Street Address",
    "notes": "Additional notes",
    "recContact": "Recruiter contact name",
    "industry": "Software | Finance | etc",
    "companySize": "1-10 | 11-50 | 51-200 | 201-500 | 500+",
    "foundedYear": "YYYY",
    "tier": "Tier 1 | Tier 2 | Tier 3",
    "linkedInUrl": "LinkedIn URL"
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

2. Job Commands:
- Create Job:
<action>
{
  "command": "create_job",
  "data": {
    "title": "Job Title",
    "companyId": "Optional Company ID",
    "companyName": "Company Name",
    "experience": "Experience Range (e.g. 3-5 Years)",
    "location": "Job Location",
    "status": "Open | Closed",
    "description": "Description text",
    "requiredSkills": ["Skill1", "Skill2"],
    "salary": "Salary Range",
    "employmentType": "Full-time | Part-time | Contract | Internship",
    "department": "Department name",
    "urgency": "Urgent | High | Medium | Low",
    "recruiterName": "Recruiter Name"
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

3. Candidate Commands:
- Create Candidate:
<action>
{
  "command": "create_candidate",
  "data": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "Phone Number",
    "experience": "e.g., 2 Years",
    "skills": ["Skill1", "Skill2"],
    "currentCompany": "Company Name",
    "status": "Pool | Applied | Screening | Shortlisted | Interview | Selected | Offer Sent | Joined",
    "education": "Education details",
    "address": "Location/Address",
    "notes": "Notes/Description",
    "designation": "Designation",
    "gender": "Male | Female | Other",
    "city": "City name",
    "expectedSalary": "Expected Salary",
    "noticePeriod": "Notice Period"
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

    // Local Tool Execution Handler
    const executeTool = async (name: string, args: any): Promise<any> => {
      console.log(`[Copilot Agent] Executing tool '${name}' with args:`, args);
      
      if (name === 'search_candidates') {
        const repo = new WorkspaceRepository('candidates', user);
        let candidates = await repo.getAll();
        
        if (args.query) {
          const q = args.query.toLowerCase();
          candidates = candidates.filter(c => {
            // 1. Scan standard fields
            const matchesStandard = 
              (c.name || '').toLowerCase().includes(q) ||
              (c.designation || '').toLowerCase().includes(q) ||
              (c.city || '').toLowerCase().includes(q) ||
              (c.skills || []).some((s: string) => s.toLowerCase().includes(q));

            if (matchesStandard) return true;

            // 2. Scan custom fields dynamically (future-proof!)
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

        // Limit fields returned to reduce tokens, but include customFields!
        return candidates.map(c => ({
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
        }));
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
        const repo = new WorkspaceRepository('jobs', user);
        await repo.create(data);
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
        const repo = new WorkspaceRepository('jobs', user);
        await repo.update(id, data);
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
    };

    // Run AI Agent call in background
    (async () => {
      try {
        const messagesForLLM = [
          { role: 'system', content: systemInstruction },
          ...messages
        ];

        // Helper to transform tool calls & responses into plain text user/assistant messages to bypass Eden AI gateway bug
        const transformMessagesForLLM = (msgs: any[]) => {
          return msgs.map(msg => {
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              const desc = msg.tool_calls.map((tc: any) => `${tc.function.name}(${tc.function.arguments || ''})`).join(', ');
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

        let loopCount = 0;
        let responseText = '';
        let cleanedResponse = '';
        let finalChoices = null;

        while (loopCount < 3) {
          console.log(`[Copilot Agent] Running ReAct iteration ${loopCount + 1}...`);
          const result = await callEdenAIWithTools(transformMessagesForLLM(messagesForLLM), tools);
          const rawMessage = result.choices?.[0]?.message;

          if (!rawMessage) {
            throw new Error('Invalid empty response received from completions API.');
          }

          if (rawMessage.tool_calls && rawMessage.tool_calls.length > 0) {
            console.log(`[Copilot Agent] Model requested ${rawMessage.tool_calls.length} tool call(s)`);
            
            // Push the assistant message with tool calls
            messagesForLLM.push(rawMessage);

            // Execute all requested tool calls in parallel
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
              
              // Push the tool execution result
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
            finalChoices = result;
            cleanedResponse = responseText;

            // Catch database constraint violations synchronously inside the loop!
            const actionMatch = responseText.match(/<action>([\s\S]*?)<\/action>/);
            if (actionMatch) {
              if (autoExecute) {
                try {
                  const actionJson = JSON.parse(actionMatch[1].trim());
                  await executeDatabaseAction(actionJson);
                  
                  // Action executed successfully! Clean output and break loop.
                  cleanedResponse = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim();
                  break;
                } catch (actionErr: any) {
                  console.error('[Copilot Agent Self-Healing] Database action failed:', actionErr.message);

                  // Append the failed assistant message and action block
                  messagesForLLM.push({
                    role: 'assistant',
                    content: responseText
                  });

                  // Append direct error feedback to prompt history
                  messagesForLLM.push({
                    role: 'user',
                    content: `[System Action Error: The database action failed with error: "${actionErr.message}". This usually means a candidate, job, or task ID you provided does not exist, or you violated a database constraint. Please check your IDs, call the appropriate search tools (e.g. 'search_candidates') to get the correct UUID, and generate the corrected <action> block again.]`
                  });

                  loopCount++;
                  continue; // Re-run completions API to allow AI to self-correct!
                }
              } else {
                // If auto-execute is disabled, we set status to pending_approval and stop loop!
                try {
                  const actionJson = JSON.parse(actionMatch[1].trim());
                  cleanedResponse = responseText.replace(/<action>[\s\S]*?<\/action>/, '').trim();
                  backgroundTasks.set(taskId, {
                    status: 'pending_approval',
                    user,
                    result: {
                      responseText: cleanedResponse,
                      action: actionJson
                    }
                  });
                  return; // Stop the background process right now!
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

        backgroundTasks.set(taskId, { status: 'completed', result: { responseText: cleanedResponse } });
      } catch (err: any) {
        console.error('Error in background copilot task:', err.message);
        backgroundTasks.set(taskId, { status: 'failed', error: err.message });
      }
    })();

    return c.json({ taskId, status: 'pending' });
  } catch (err: any) {
    console.error('Error in copilot route:', err.message);
    return c.json({
      error: 'Failed to initiate AI Copilot.',
      details: err.message
    }, 500);
  }
});

// Approve Copilot Action Endpoint
app.post('/api/ai/copilot/approve', requirePermission('copilot.open'), async (c) => {
  try {
    const { taskId } = await c.req.json();
    if (!taskId) {
      return c.json({ error: 'taskId is required' }, 400);
    }

    const task = backgroundTasks.get(taskId);
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    if (task.status !== 'pending_approval') {
      return c.json({ error: `Task cannot be approved. Current status: ${task.status}` }, 400);
    }

    // Execute database action command stored in task using stored user context
    const actionJson = task.result.action;
    
    // Declare execution logic locally or call same repository structure
    const { command, id, data } = actionJson;
    const user = task.user;
    console.log(`[Copilot Action Approval] Executing command: ${command} for user: ${user.email}`);

    if (command === 'create_candidate') {
      const repo = new WorkspaceRepository('candidates', user);
      await repo.create(data);
    } else if (command === 'create_job') {
      const repo = new WorkspaceRepository('jobs', user);
      await repo.create(data);
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
      const repo = new WorkspaceRepository('jobs', user);
      await repo.update(id, data);
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
        systemInstruction = "You are a lead technical interviewer. Generate tailored, highly practical interview questions.";
        prompt = `Generate 3 specialized, highly practical technical and behavioral interview questions for a candidate applying to the following position:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Description: ${job.description}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}.
Focus on realistic engineering problems they might face at this company. Present in clean markdown.`;
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
        systemInstruction = "You are a talent acquisition strategist. Predict hiring market difficulty.";
        prompt = `Predict the hiring difficulty (Easy, Medium, High) for the following job in the current tech market:
Job Title: ${job.title}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Salary: ${job.salary}
Location: ${job.location}.
Provide a clear difficulty rating and 2-3 sentences explaining the market factors and recommendation strategies.`;
        break;
      case 'salary_recomm':
        title = 'AI Salary Benchmark Advice';
        systemInstruction = "You are a compensation analyst. Provide salary recommendations.";
        prompt = `Provide market salary benchmarking advice for the following role:
Job Title: ${job.title}
Location: ${job.location}
Salary: ${job.salary}.
List the estimated 25th, 50th (median), and 90th percentile market rates, and give a recommendation on whether the current salary is competitive.`;
        break;
      case 'alt_skills':
        title = 'Alternative / Equivalent Skills Suggested';
        systemInstruction = "You are a sourcing agent. Provide alternative keywords/skills.";
        prompt = `For the following required skills list: ${JSON.stringify(job.requiredSkills || [])} of job ${job.title}, suggest equivalent or alternative skills, technologies, or keywords that recruiters should look for if the primary skills are scarce. Provide 3-4 suggestions.`;
        break;
      case 'candidate_email':
        title = 'AI Candidate Outreach Email Generator';
        systemInstruction = "You are an outreach copywriter. Draft a compelling cold email.";
        prompt = `Write a professional, compelling candidate outreach email sequence template from a recruiter (Sarah Jenkins) inviting a candidate to apply for this job:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Salary: ${job.salary}.
Use [Candidate Name] as placeholder. Include subject line and body in markdown.`;
        break;
      case 'whatsapp_msg':
        title = 'AI WhatsApp Ping Generator';
        systemInstruction = "You are a conversational recruiter. Write a short SMS/WhatsApp outreach message.";
        prompt = `Write a short, engaging, and casual WhatsApp/SMS outreach message (max 150 words) from a recruiter (Sarah) to a candidate about this role:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Salary: ${job.salary}.
Keep it concise and friendly, using [Candidate Name] as a placeholder.`;
        break;
      default:
        return c.json({ error: 'Invalid toolKey' }, 400);
    }

    const taskId = 'task_jobtool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    backgroundTasks.set(taskId, { status: 'pending' });

    // Run AI call in background
    (async () => {
      try {
        const isStructured = toolKey === 'questions';
        const responseText = await callLLM(
          systemInstruction, 
          prompt, 
          0.7, 
          isStructured ? questionsSchema : undefined
        );
        if (isStructured) {
          const parsedData = cleanJsonResponse(responseText);
          backgroundTasks.set(taskId, { 
            status: 'completed', 
            result: { title, structured: true, data: parsedData } 
          });
        } else {
          backgroundTasks.set(taskId, { 
            status: 'completed', 
            result: { title, text: responseText } 
          });
        }
      } catch (err: any) {
        console.error('Error in background job-tool task:', err.message);
        backgroundTasks.set(taskId, { status: 'failed', error: err.message });
      }
    })();

    return c.json({ taskId, status: 'pending' });
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
      currentUser: {
        role: user.role,
        permissions: user.permissions,
        restrictedFeatures: user.restricted_features || []
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
    const data = await repo.getAll();
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/team_members', requirePermission('team.add'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    const { data, error } = await supabase.rpc('create_invited_user', {
      p_email: snakeBody.email,
      p_name: snakeBody.name,
      p_role: snakeBody.role || 'Recruiter',
      p_workspace_id: user.workspace_id,
      p_department: snakeBody.department,
      p_password: snakeBody.password || 'password123'
    });
    
    if (error) throw error;
    
    const { data: newProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data)
      .single();
      
    if (fetchError) throw fetchError;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: newProfile.id,
      target_user_name: newProfile.name,
      action: 'Member Invited',
      previous_role: null,
      new_role: newProfile.role,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(keysToCamel(newProfile));
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
    const data = await repo.getAll();
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

// Bun Native Server entry point
export default {
  port: parseInt(process.env.PORT || '3001'),
  fetch: app.fetch
};
