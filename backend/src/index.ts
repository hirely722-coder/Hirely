import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabase } from './db';
import { keysToCamel, keysToSnake } from './utils';
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

// Memory store for background LLM tasks
export interface BackgroundTask {
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error?: string;
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
// AI Endpoints
// -------------------------------------------------------------

// Resume Parser (File upload endpoint via multipart/form-data)
app.post('/api/ai/parse-resume', async (c) => {
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



// Copilot Chat / Search Engine
app.post('/api/ai/copilot', async (c) => {
  try {
    const { messages, context } = await c.req.json();
    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    const systemInstruction = `You are a helpful, professional AI Recruiter Assistant called Copilot.
You assist the recruiter in managing candidates, jobs, companies, tasks, and templates.
You have ACCESS to the current state of the application. Here is the current data in the ATS:

-- COMPANIES --
${JSON.stringify(context?.companies || [])}

-- ACTIVE JOBS --
${JSON.stringify(context?.jobs || [])}

-- CANDIDATES --
${JSON.stringify(context?.candidates || [])}

-- TASKS --
${JSON.stringify(context?.tasks || [])}

-- EMAIL TEMPLATES --
${JSON.stringify(context?.templates || [])}

IMPORTANT CAPABILITIES & GUIDELINES:
1. Search & Filter: When requested to search or find candidates (e.g. "Find Python developers", "Candidates with 5 years experience"), analyze the data and provide the matched candidate names, their score, and brief justifications.
2. AI Match: Recommend the highest matching candidates for a specific Job ID or Job Title (e.g., "Match candidates for Job #j1"). Do skills overlap calculations.
3. Content Generation: Write follow-up emails, interview scheduling emails, or template content using candidate-specific values. Keep the response formatted in clean, professional markdown.
4. Professional tone: Be brief, highly focused, and actionable. Do not show internal IDs like "can1" or "c2" directly in human conversations unless helpful; reference the name instead.
5. If asked to do something that isn't possible, politely guide the recruiter. Avoid verbose explanations or technical code details.`;

    const taskId = 'task_copilot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    backgroundTasks.set(taskId, { status: 'pending' });

    // Run AI call in background
    (async () => {
      try {
        const responseText = await callLLM(systemInstruction, messages, 0.7, false);
        backgroundTasks.set(taskId, { status: 'completed', result: { responseText } });
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

// Job AI Tool Endpoint
app.post('/api/ai/job-tool', async (c) => {
  try {
    const { toolKey, job, candidates } = await c.req.json();
    if (!toolKey || !job) {
      return c.json({ error: 'toolKey and job are required' }, 400);
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

  // Fetch profiles to retrieve workspace_id and role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_id, role, name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.workspace_id) {
    return c.json({ error: 'Unauthorized: User workspace profile not found' }, 403);
  }

  c.set('user', {
    ...user,
    workspace_id: profile.workspace_id,
    role: profile.role,
    name: profile.name
  });
  await next();
});

// -------------------------------------------------------------
// CRUD Endpoints (mapped to Supabase)
// -------------------------------------------------------------

// Helper: Generic table routing
const createCRUD = (tableName: string) => {
  // GET all
  app.get(`/api/${tableName}`, async (c) => {
    const user = c.get('user') as any;
    try {
      let allData: any[] = [];
      let start = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('workspace_id', user.workspace_id)
          .order('created_at', { ascending: false })
          .range(start, start + limit - 1);

        if (error) {
          return c.json({ error: error.message }, 500);
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

      return c.json(keysToCamel(allData));
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // POST create
  app.post(`/api/${tableName}`, async (c) => {
    const user = c.get('user') as any;
    if (user.role === 'Viewer') {
      return c.json({ error: 'Forbidden: Viewers cannot create records.' }, 403);
    }

    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    snakeBody.workspace_id = user.workspace_id;
    snakeBody.created_by = user.id;
    snakeBody.updated_by = user.id;
    delete snakeBody.user_id;

    const { data, error } = await supabase.from(tableName).insert([snakeBody]).select();
    if (error) return c.json({ error: error.message }, 500);

    // If candidate with resume is uploaded, check settings and dispatch alert
    if (tableName === 'candidates' && snakeBody.resume_file_name) {
      try {
        let { data: config } = await supabase
          .from('email_configs')
          .select('*')
          .eq('workspace_id', user.workspace_id)
          .single();

        if (!config) {
          const { data: defConfig } = await supabase
            .from('email_configs')
            .select('*')
            .eq('id', 'default')
            .single();
          config = defConfig;
        }

        if (config && config.resume_notification_enabled) {
          const targetEmail = config.resume_notification_email || user.email;
          if (targetEmail) {
            console.log(`[MOCK EMAIL] New Candidate Resume Upload Notification:
To: ${targetEmail}
Subject: New Candidate Uploaded: ${snakeBody.name}
Body: A new candidate has been successfully uploaded and parsed from resume file "${snakeBody.resume_file_name}".
Candidate Name: ${snakeBody.name}
Email: ${snakeBody.email || 'N/A'}
Phone: ${snakeBody.phone || 'N/A'}
Experience: ${snakeBody.experience || 'N/A'}
Skills: ${Array.isArray(snakeBody.skills) ? snakeBody.skills.join(', ') : (snakeBody.skills || 'None')}`);

            // Automatically log to communication_logs table
            const newCommLog = {
              candidate_id: data[0].id,
              type: 'Email',
              date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Sent',
              sent_by: 'System (Auto-Alert)',
              subject: `New Candidate Alert: ${snakeBody.name}`,
              message: `Automatic alert dispatched to ${targetEmail} for parsed candidate ${snakeBody.name} (File: ${snakeBody.resume_file_name}).`,
              workspace_id: user.workspace_id,
              created_by: user.id,
              updated_by: user.id
            };
            await supabase.from('communication_logs').insert([newCommLog]);
          }
        }

        // 2. Telegram Alert Notification
        if (config && config.telegram_chat_id && config.telegram_notification_enabled) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            const messageText = `<b>🔔 New Resume Uploaded &amp; Parsed!</b>
<b>Name:</b> ${snakeBody.name}
<b>Email:</b> ${snakeBody.email || 'N/A'}
<b>Phone:</b> ${snakeBody.phone || 'N/A'}
<b>Experience:</b> ${snakeBody.experience || 'N/A'}
<b>Skills:</b> ${Array.isArray(snakeBody.skills) ? snakeBody.skills.join(', ') : (snakeBody.skills || 'None')}

<i>Candidate has been added to your Talent Pool.</i>`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: config.telegram_chat_id,
                text: messageText,
                parse_mode: 'HTML'
              })
            });

            console.log(`[TELEGRAM] Sent resume alert for ${snakeBody.name} to chat_id ${config.telegram_chat_id}`);

            // Log Telegram notification to communication_logs table
            const newCommLog = {
              candidate_id: data[0].id,
              type: 'Follow-up',
              date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Sent',
              sent_by: 'System (Telegram Alert)',
              subject: `New Candidate Telegram Alert: ${snakeBody.name}`,
              message: `Telegram notification alert sent to verified chat ID ${config.telegram_chat_id} for candidate ${snakeBody.name}.`,
              workspace_id: user.workspace_id,
              created_by: user.id,
              updated_by: user.id
            };
            await supabase.from('communication_logs').insert([newCommLog]);
          }
        }
      } catch (err) {
        console.error('Failed to process candidate upload notification alert:', err);
      }
    }

    return c.json(keysToCamel(data[0]));
  });

  // POST bulk
  app.post(`/api/${tableName}/bulk`, async (c) => {
    const user = c.get('user') as any;
    if (user.role === 'Viewer') {
      return c.json({ error: 'Forbidden: Viewers cannot create records.' }, 403);
    }

    const list = await c.req.json();
    if (!Array.isArray(list)) return c.json({ error: 'Body must be an array' }, 400);
    const snakeList = list.map(item => {
      const snakeItem = keysToSnake(item);
      snakeItem.workspace_id = user.workspace_id;
      snakeItem.created_by = user.id;
      snakeItem.updated_by = user.id;
      delete snakeItem.user_id;
      return snakeItem;
    });
    const { data, error } = await supabase.from(tableName).upsert(snakeList).select();
    if (error) return c.json({ error: error.message }, 500);
    return c.json(keysToCamel(data));
  });

  // PUT update
  app.put(`/api/${tableName}/:id`, async (c) => {
    const user = c.get('user') as any;
    if (user.role === 'Viewer') {
      return c.json({ error: 'Forbidden: Viewers cannot edit records.' }, 403);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    delete snakeBody.id;
    delete snakeBody.created_at;
    delete snakeBody.workspace_id;
    delete snakeBody.created_by;
    delete snakeBody.user_id;

    snakeBody.updated_by = user.id;
    snakeBody.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(tableName)
      .update(snakeBody)
      .eq('id', id)
      .eq('workspace_id', user.workspace_id)
      .select();
    if (error) return c.json({ error: error.message }, 500);
    if (!data || data.length === 0) return c.json({ error: 'Record not found or access denied' }, 404);
    return c.json(keysToCamel(data[0]));
  });

  // PATCH update
  app.patch(`/api/${tableName}/:id`, async (c) => {
    const user = c.get('user') as any;
    if (user.role === 'Viewer') {
      return c.json({ error: 'Forbidden: Viewers cannot edit records.' }, 403);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    delete snakeBody.id;
    delete snakeBody.created_at;
    delete snakeBody.workspace_id;
    delete snakeBody.created_by;
    delete snakeBody.user_id;

    snakeBody.updated_by = user.id;
    snakeBody.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(tableName)
      .update(snakeBody)
      .eq('id', id)
      .eq('workspace_id', user.workspace_id)
      .select();
    if (error) return c.json({ error: error.message }, 500);
    if (!data || data.length === 0) return c.json({ error: 'Record not found or access denied' }, 404);
    return c.json(keysToCamel(data[0]));
  });

  // DELETE single
  app.delete(`/api/${tableName}/:id`, async (c) => {
    const user = c.get('user') as any;
    if (user.role === 'Viewer' || user.role === 'Recruiter') {
      return c.json({ error: 'Forbidden: Only Admins and Owners can delete records.' }, 403);
    }

    const id = c.req.param('id');
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('workspace_id', user.workspace_id);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, id });
  });

  // DELETE by query (e.g. importId rollback)
  app.delete(`/api/${tableName}`, async (c) => {
    const user = c.get('user') as any;
    if (user.role === 'Viewer' || user.role === 'Recruiter') {
      return c.json({ error: 'Forbidden: Only Admins and Owners can perform mass deletions.' }, 403);
    }

    const importId = c.req.query('importId');
    if (!importId) return c.json({ error: 'importId query parameter is required' }, 400);
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('import_id', importId)
      .eq('workspace_id', user.workspace_id);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, importId });
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

// Profiles / Team Members Dedicated Workspace-Scoped Endpoints
app.get('/api/team_members', async (c) => {
  const user = c.get('user') as any;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('workspace_id', user.workspace_id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json(keysToCamel(data));
});

app.post('/api/team_members', async (c) => {
  const user = c.get('user') as any;
  if (user.role !== 'Owner' && user.role !== 'Admin') {
    return c.json({ error: 'Forbidden: Only Owners and Admins can add team members.' }, 403);
  }
  const body = await c.req.json();
  const snakeBody = keysToSnake(body);
  
  const { data, error } = await supabase.rpc('create_invited_user', {
    p_email: snakeBody.email,
    p_name: snakeBody.name,
    p_role: snakeBody.role || 'Recruiter',
    p_workspace_id: user.workspace_id,
    p_department: snakeBody.department
  });
  
  if (error) return c.json({ error: error.message }, 500);
  
  const { data: newProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data)
    .single();
    
  if (fetchError) return c.json({ error: fetchError.message }, 500);
  return c.json(keysToCamel(newProfile));
});

app.put('/api/team_members/:id', async (c) => {
  const user = c.get('user') as any;
  if (user.role !== 'Owner' && user.role !== 'Admin') {
    return c.json({ error: 'Forbidden: Only Owners and Admins can update team members.' }, 403);
  }
  const id = c.req.param('id');
  const body = await c.req.json();
  const snakeBody = keysToSnake(body);
  
  delete snakeBody.id;
  delete snakeBody.created_at;
  delete snakeBody.workspace_id;
  delete snakeBody.email;
  
  const { data, error } = await supabase
    .from('profiles')
    .update(snakeBody)
    .eq('id', id)
    .eq('workspace_id', user.workspace_id)
    .select();
    
  if (error) return c.json({ error: error.message }, 500);
  if (!data || data.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json(keysToCamel(data[0]));
});

app.delete('/api/team_members/:id', async (c) => {
  const user = c.get('user') as any;
  if (user.role !== 'Owner' && user.role !== 'Admin') {
    return c.json({ error: 'Forbidden: Only Owners and Admins can delete team members.' }, 403);
  }
  const id = c.req.param('id');
  
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single();
    
  if (targetProfile && targetProfile.role === 'Owner') {
    return c.json({ error: 'Forbidden: Cannot delete the workspace Owner.' }, 403);
  }
  
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .eq('workspace_id', user.workspace_id);
    
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true, id });
});

// Special Single-Row Endpoint for Email Config
app.get('/api/email-config', async (c) => {
  const user = c.get('user') as any;
  const { data, error } = await supabase.from('email_configs').select('*').eq('workspace_id', user.workspace_id).single();
  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ provider: 'Gmail', isConnected: false });
    }
    return c.json({ error: error.message }, 500);
  }
  return c.json(keysToCamel(data));
});

app.post('/api/email-config', async (c) => {
  const user = c.get('user') as any;
  if (user.role === 'Viewer') {
    return c.json({ error: 'Forbidden: Viewers cannot edit configuration.' }, 403);
  }
  const body = await c.req.json();
  const snakeBody = keysToSnake(body);
  snakeBody.workspace_id = user.workspace_id;
  snakeBody.updated_by = user.id;
  
  const { data, error } = await supabase.from('email_configs').upsert([snakeBody]).select();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(keysToCamel(data[0]));
});

// ============================================================
// JOB CANDIDATES (Pipeline) Routes
// ============================================================

// GET all candidates linked to any job
app.get('/api/job-candidates', async (c) => {
  const user = c.get('user') as any;
  try {
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('job_candidates')
        .select('*')
        .eq('workspace_id', user.workspace_id)
        .order('id', { ascending: true })
        .range(start, start + limit - 1);

      if (error) {
        return c.json({ error: error.message }, 500);
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

    return c.json(keysToCamel(allData));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET all candidates linked to a specific job (with full candidate data)
app.get('/api/job-candidates/:jobId', async (c) => {
  const user = c.get('user') as any;
  const jobId = c.req.param('jobId');

  try {
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('job_candidates')
        .select('*, candidate:candidates(*)')
        .eq('job_id', jobId)
        .eq('workspace_id', user.workspace_id)
        .order('added_date', { ascending: false })
        .order('id', { ascending: true })
        .range(start, start + limit - 1);

      if (error) {
        return c.json({ error: error.message }, 500);
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

    const result = allData.map((row: any) => ({
      ...keysToCamel(row),
      candidate: row.candidate ? keysToCamel(row.candidate) : null,
    }));
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST — link a candidate to a job (add to pipeline)
app.post('/api/job-candidates', async (c) => {
  const user = c.get('user') as any;
  if (user.role === 'Viewer') {
    return c.json({ error: 'Forbidden: Viewers cannot edit pipeline.' }, 403);
  }
  const body = await c.req.json();

  const row = {
    job_id: body.jobId,
    candidate_id: body.candidateId,
    stage: body.stage || 'Applied',
    added_date: new Date().toISOString().split('T')[0],
    workspace_id: user.workspace_id,
    created_by: user.id,
    updated_by: user.id
  };

  const { data, error } = await supabase
    .from('job_candidates')
    .upsert([row], { onConflict: 'job_id,candidate_id' })
    .select();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(keysToCamel(data[0]));
});

// PATCH — update stage or details for a specific job_candidate row
app.patch('/api/job-candidates/:id', async (c) => {
  const user = c.get('user') as any;
  if (user.role === 'Viewer') {
    return c.json({ error: 'Forbidden: Viewers cannot edit pipeline.' }, 403);
  }
  const id = c.req.param('id');
  const body = await c.req.json();
  const snakeBody = keysToSnake(body);

  delete snakeBody.id;
  delete snakeBody.created_at;
  delete snakeBody.workspace_id;
  delete snakeBody.created_by;
  delete snakeBody.user_id;

  snakeBody.updated_by = user.id;

  const { data, error } = await supabase
    .from('job_candidates')
    .update(snakeBody)
    .eq('id', id)
    .eq('workspace_id', user.workspace_id)
    .select();

  if (error) return c.json({ error: error.message }, 500);
  if (!data || data.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json(keysToCamel(data[0]));
});

// DELETE — remove candidate from a job's pipeline (returns them to Talent Pool)
app.delete('/api/job-candidates/:id', async (c) => {
  const user = c.get('user') as any;
  if (user.role === 'Viewer' || user.role === 'Recruiter') {
    return c.json({ error: 'Forbidden: Recruiters and Viewers cannot delete pipeline links.' }, 403);
  }
  const id = c.req.param('id');

  const { error } = await supabase
    .from('job_candidates')
    .delete()
    .eq('id', id)
    .eq('workspace_id', user.workspace_id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
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

// Bun Native Server entry point
export default {
  port: parseInt(process.env.PORT || '3001'),
  fetch: app.fetch
};
