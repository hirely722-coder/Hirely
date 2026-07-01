import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabase } from './db';
import { keysToCamel, keysToSnake } from './utils';
import dotenv from 'dotenv';

dotenv.config();

const app = new Hono();

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
    cleaned = match[1];
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

// Helper: Call Eden AI chat completion
async function callEdenAI(systemInstruction: string, userMessageContent: any) {
  const apiKey = process.env.EDENAI_API_KEY;
  if (!apiKey) {
    throw new Error('EDENAI_API_KEY is not defined in backend .env file.');
  }

  // Construct message format. If userMessageContent is string, send as simple user message.
  // If it's an array (multimodal), pass it directly.
  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userMessageContent }
  ];

  const payload = {
    model: 'google/gemma-4-31b-it',
    messages,
    temperature: 0.2 // Lower temperature for more structured parsing accuracy
  };

  console.log('Sending request to Eden AI for model: google/gemma-4-31b-it');
  
  const response = await fetch('https://api.edenai.run/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Eden AI API Error:', errorText);
    throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Empty response received from Eden AI.');
  }

  return rawContent;
}

// -------------------------------------------------------------
// AI Endpoints
// -------------------------------------------------------------

// Resume Parser (File upload endpoint via multipart/form-data)
app.post('/api/ai/parse-resume', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file; // This is a File / Blob object
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'A file input (pdf, png, jpg, txt, docx) is required' }, 400);
    }

    const systemInstruction = `You are an expert AI resume parser. Extract the relevant fields from the provided resume text or document as accurately as possible.
Return ONLY a valid JSON object matching this schema:
{
  "name": "Candidate full name",
  "email": "Candidate email address",
  "phone": "Candidate phone number",
  "skills": ["List of technical skills, frameworks, and programming languages"],
  "experience": "Years or level of experience, e.g. '5 Years' or 'Senior'",
  "education": "Highest degree and school name",
  "currentCompany": "Most recent company name",
  "address": "Location, city and state",
  "resumeTextSummary": "Comprehensive plain-text reconstruction or summary of the resume"
}
Do not include any explanation, markdown code blocks, or extra text. Output ONLY the JSON.`;

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

    let userContent: any;
    
    if (mimeType === 'text/plain' || file.name.endsWith('.txt')) {
      const textContent = Buffer.from(arrayBuffer).toString('utf-8');
      userContent = `Please extract candidate profile fields from this resume text:\n\n${textContent}`;
    } else if (mimeType === 'application/pdf') {
      userContent = [
        { type: 'text', text: 'Extract candidate profile fields from this uploaded resume document.' },
        { 
          type: 'file', 
          file: { 
            file_data: `data:${mimeType};base64,${base64Data}`, 
            filename: file.name
          } 
        }
      ];
    } else if (mimeType.startsWith('image/')) {
      userContent = [
        { type: 'text', text: 'Extract candidate profile fields from this uploaded resume image.' },
        { 
          type: 'image_url', 
          image_url: { url: `data:${mimeType};base64,${base64Data}` } 
        }
      ];
    } else {
      // Default fallback for binary file uploads (e.g. DOCX/RTF)
      userContent = [
        { type: 'text', text: 'Extract candidate profile fields from this uploaded resume document.' },
        { 
          type: 'file', 
          file: { 
            file_data: `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`, 
            filename: file.name
          } 
        }
      ];
    }

    const parsedText = await callEdenAI(systemInstruction, userContent);
    const parsedData = cleanJsonResponse(parsedText);
    return c.json({ data: parsedData });
  } catch (err: any) {
    console.error('Error in parse-resume:', err.message);
    return c.json({
      error: 'Failed to parse resume using Eden AI.',
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

    const apiKey = process.env.EDENAI_API_KEY;
    if (!apiKey) {
      throw new Error('EDENAI_API_KEY is not defined in backend .env file.');
    }

    // Map messages history to standard OpenAI format
    const formattedMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    const response = await fetch('https://api.edenai.run/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemma-4-31b-it',
        messages: formattedMessages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const responseText = result.choices?.[0]?.message?.content || 'Sorry, I encountered an issue processing your query.';
    
    return c.json({ responseText });
  } catch (err: any) {
    console.error('Error in copilot route:', err.message);
    return c.json({
      error: 'Failed to reach AI Copilot. Please verify your EDENAI_API_KEY.',
      details: err.message
    }, 500);
  }
});

// -------------------------------------------------------------
// CRUD Endpoints (mapped to Supabase)
// -------------------------------------------------------------

// Helper: Generic table routing
const createCRUD = (tableName: string) => {
  // GET all
  app.get(`/api/${tableName}`, async (c) => {
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json(keysToCamel(data));
  });

  // POST create
  app.post(`/api/${tableName}`, async (c) => {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    const { data, error } = await supabase.from(tableName).insert([snakeBody]).select();
    if (error) return c.json({ error: error.message }, 500);
    return c.json(keysToCamel(data[0]));
  });

  // POST bulk
  app.post(`/api/${tableName}/bulk`, async (c) => {
    const list = await c.req.json();
    if (!Array.isArray(list)) return c.json({ error: 'Body must be an array' }, 400);
    const snakeList = list.map(item => keysToSnake(item));
    const { data, error } = await supabase.from(tableName).upsert(snakeList).select();
    if (error) return c.json({ error: error.message }, 500);
    return c.json(keysToCamel(data));
  });

  // PUT update
  app.put(`/api/${tableName}/:id`, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    // Don't update PRIMARY KEY if it's sent in the body
    delete snakeBody.id;
    delete snakeBody.created_at;

    const { data, error } = await supabase.from(tableName).update(snakeBody).eq('id', id).select();
    if (error) return c.json({ error: error.message }, 500);
    if (!data || data.length === 0) return c.json({ error: 'Record not found' }, 404);
    return c.json(keysToCamel(data[0]));
  });

  // DELETE single
  app.delete(`/api/${tableName}/:id`, async (c) => {
    const id = c.req.param('id');
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, id });
  });

  // DELETE by query (e.g. importId rollback)
  app.delete(`/api/${tableName}`, async (c) => {
    const importId = c.req.query('importId');
    if (!importId) return c.json({ error: 'importId query parameter is required' }, 400);
    const { error } = await supabase.from(tableName).delete().eq('import_id', importId);
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
createCRUD('team_members');
createCRUD('communication_logs');

// Special Single-Row Endpoint for Email Config
app.get('/api/email-config', async (c) => {
  const { data, error } = await supabase.from('email_configs').select('*').eq('id', 'default').single();
  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ provider: 'Gmail', isConnected: false });
    }
    return c.json({ error: error.message }, 500);
  }
  return c.json(keysToCamel(data));
});

app.post('/api/email-config', async (c) => {
  const body = await c.req.json();
  const snakeBody = keysToSnake(body);
  snakeBody.id = 'default';
  
  const { data, error } = await supabase.from('email_configs').upsert([snakeBody]).select();
  if (error) return c.json({ error: error.message }, 500);
  return c.json(keysToCamel(data[0]));
});

// Bun Native Server entry point
export default {
  port: parseInt(process.env.PORT || '3001'),
  fetch: app.fetch
};
