import { Hono } from 'hono';
import { stream, streamText } from 'hono/streaming';
import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';
import { supabase } from '../db';
import { WorkspaceRepository } from '../repository';
import { requirePermission } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  callLLM,
  callLLMStream,
  callEdenAIWithTools,
  callEdenAIWithToolsStream,
  logAIRequest,
  streamEmitter
} from '../services/ai.service';
import { cleanJsonResponse, keysToCamel, keysToSnake } from '../utils';
import { sanitizeJobData } from '../services/worker';

export interface StreamingEvent {
  type: 'assistant_message_start' | 'assistant_delta' | 'assistant_message_end' | 'tool_start' | 'tool_complete' | 'approval_required' | 'completed' | 'error';
  content?: string;
  tool?: string;
  args?: any;
  result?: any;
  action?: any;
  text?: string;
  message?: string;
}

export const aiRouter = new Hono<{
  Variables: {
    user: any;
  }
}>();

// Resume Parser (File upload endpoint via multipart/form-data)
aiRouter.post('/parse-resume', requirePermission('candidates.run_ai_parsing'), rateLimiter(10, 60000, 'ai_parse'), async (c) => {
  const startTime = Date.now();
  const user = c.get('user') as any;
  try {
    const body = await c.req.parseBody();
    const file = body.file; // This is a File / Blob object
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'A file input (pdf, txt) is required' }, 400);
    }

    // Enforce 10MB maximum size limit
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds the maximum limit of 10MB.' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const arrayBufferCopy = arrayBuffer.slice(0);
    const mimeType = file.type;
    const nameLower = file.name.toLowerCase();

    // Strictly validate file extensions and MIME types to prevent extension spoofing
    const isPdf = mimeType === 'application/pdf' && nameLower.endsWith('.pdf');
    const isTxt = mimeType === 'text/plain' && nameLower.endsWith('.txt');
    const isImage = mimeType.startsWith('image/') && (nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.webp'));

    if (!isPdf && !isTxt && !isImage) {
      return c.json({ error: `Unsupported file format: ${mimeType || 'unknown'}. Only PDF, TXT, and PNG/JPG/WEBP images with matching extensions are supported.` }, 400);
    }

    console.log("--- START PARSE RESUME (SYNCHRONOUS) ---");
    console.log("File Name:", file.name);
    console.log("File Type / MIME:", mimeType);

    let textContent = '';
    
    if (isTxt) {
      textContent = Buffer.from(arrayBuffer).toString('utf-8');
    } else if (isPdf) {
      try {
        const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
        const result = await extractText(pdf);
        textContent = typeof result === 'string' ? result : (result as any).text?.join('\n') || '';
      } catch (pdfErr: any) {
        console.error('[Resume Parser] unpdf extraction failed:', pdfErr.message);
        textContent = '';
      }
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

    console.log("--- END PARSE RESUME (SYNCHRONOUS) ---");

    const responseTimeMs = Date.now() - startTime;
    await logAIRequest(user, 'Resume Parsing', 'Eden AI (Gemma)', 0, 0.005, responseTimeMs, 'Success');

    return c.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Error in parse-resume:', err.message);
    const responseTimeMs = Date.now() - startTime;
    await logAIRequest(user, 'Resume Parsing', 'Eden AI (Gemma)', 0, 0, responseTimeMs, 'Failure');
    return c.json({
      error: 'Failed to parse resume.',
      details: err.message
    }, 500);
  }
});

// File Parser (extracts text from uploaded PDF/TXT/CSV files)
aiRouter.post('/parse-file', requirePermission('candidates.run_ai_parsing'), rateLimiter(10, 60000, 'ai_parse'), async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file; // This is a File / Blob object
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'A file input is required' }, 400);
    }

    // Enforce 10MB maximum size limit
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds the maximum limit of 10MB.' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const arrayBufferCopy = arrayBuffer.slice(0);
    const mimeType = file.type;
    const nameLower = file.name.toLowerCase();

    // Strictly validate file extensions and MIME types to prevent extension spoofing
    const isPdf = mimeType === 'application/pdf' && nameLower.endsWith('.pdf');
    const isImage = mimeType.startsWith('image/') && (nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.webp'));
    
    if (!isPdf && !isImage) {
      return c.json({ error: `Unsupported file format: ${mimeType || 'unknown'}. Only PDF and PNG/JPG/WEBP images with matching extensions are supported.` }, 400);
    }
    
    let textContent = '';
    
    if (isPdf) {
      try {
        const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
        const result = await extractText(pdf);
        textContent = typeof result === 'string' ? result : (result as any).text?.join('\n') || '';
      } catch (pdfErr: any) {
        console.error('[Copilot File Parser] unpdf extraction failed:', pdfErr.message);
        textContent = '';
      }

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

// Copilot Chat / Search Engine Agent Loop
export async function* runCopilotAgent(
  taskId: string,
  messages: any[],
  autoExecute: boolean,
  user: any,
  systemInstruction: string,
  tools: any[],
  signal?: AbortSignal
): AsyncGenerator<StreamingEvent, void, unknown> {
  const transformMessagesForLLM = (msgs: any[]) => {
    return msgs.map(msg => {
      if (msg.role === 'assistant' && msg.pendingAction) {
        const desc = msg.pendingAction.command;
        return {
          role: 'assistant',
          content: `[System Action: Invoked tools: ${desc}]`
        };
      }
      
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        const callsDesc = msg.tool_calls.map((c: any) => {
          let argsStr = '';
          try {
            argsStr = typeof c.function.arguments === 'string' 
              ? c.function.arguments 
              : JSON.stringify(c.function.arguments);
          } catch (e) {}
          return `${c.function.name}(${argsStr})`;
        }).join(', ');
        
        return {
          role: 'assistant',
          content: msg.content 
            ? `${msg.content}\n[System Action: Requested tool execution: ${callsDesc}]` 
            : `[System Action: Requested tool execution: ${callsDesc}]`,
          tool_calls: msg.tool_calls
        };
      }
      
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: msg.tool_call_id,
          name: msg.name,
          content: msg.content
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

  const getStems = (query: string): string[] => {
    return query
      .toLowerCase()
      .split(/[\s,\-_]+/)
      .map(w => {
        let stem = w.trim();
        if (stem.length <= 3) return stem;
        stem = stem.replace(/(?:ing|ant|ent|er|ist|s|ed|ly|ment|ional|al|ive)$/, '');
        return stem;
      })
      .filter(w => w.length > 2);
  };

  const executeTool = async (name: string, args: any): Promise<any> => {
    const run = async () => {
      console.log(`[Copilot Agent] Executing tool '${name}' with args:`, args);
    
      if (name === 'search_candidates') {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .eq('workspace_id', user.workspace_id)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;

        let candidates = keysToCamel(data || []);
        
        if (args.query) {
          const q = args.query.toLowerCase();
          const stems = getStems(q);

          candidates = candidates.filter(c => {
            const nameMatch = (c.name || '').toLowerCase().includes(q);
            const emailMatch = (c.email || '').toLowerCase().includes(q);
            const designationMatch = (c.designation || '').toLowerCase().includes(q);
            const cityMatch = (c.city || '').toLowerCase().includes(q);
            
            const candidateSkills = (c.skills || []).map((s: string) => s.toLowerCase());
            const skillsMatch = candidateSkills.some((s: string) => 
              s.includes(q) || stems.some(stem => s.includes(stem))
            );

            const designationStemMatch = stems.some(stem => 
              (c.designation || '').toLowerCase().includes(stem)
            );

            const resumeMatch = (c.resumeText || '').toLowerCase().includes(q) || 
                                stems.some(stem => (c.resumeText || '').toLowerCase().includes(stem));
            const notesMatch = (c.notes || '').toLowerCase().includes(q) || 
                               stems.some(stem => (c.notes || '').toLowerCase().includes(stem));

            let customFieldsMatch = false;
            if (c.customFields && typeof c.customFields === 'object') {
              customFieldsMatch = Object.entries(c.customFields).some(([key, val]) => {
                const fieldKey = key.toLowerCase();
                const fieldValue = String(val || '').toLowerCase();
                return fieldKey.includes(q) || fieldValue.includes(q) || stems.some(stem => fieldValue.includes(stem));
              });
            }

            return nameMatch || emailMatch || designationMatch || cityMatch || skillsMatch || designationStemMatch || resumeMatch || notesMatch || customFieldsMatch;
          });
        }

        if (args.skills && Array.isArray(args.skills) && args.skills.length > 0) {
          const lowerSkills = args.skills.map((s: string) => s.toLowerCase());
          candidates = candidates.filter(c => {
            const candidateSkills = (c.skills || []).map((s: string) => s.toLowerCase());
            return lowerSkills.every((s: string) => candidateSkills.includes(s));
          });
        }

        if (args.stage) {
          const lowerStage = args.stage.toLowerCase();
          candidates = candidates.filter(c => (c.status || '').toLowerCase() === lowerStage);
        }

        const totalMatches = candidates.length;
        const limit = args.limit ? Math.min(args.limit, 30) : 15;
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
        const { data, error } = await supabase
          .from('candidates')
          .select('resume_text, notes')
          .eq('id', args.candidate_id)
          .eq('workspace_id', user.workspace_id)
          .maybeSingle();

        if (error) throw error;
        return { resume_text: data?.resume_text || data?.notes || 'No resume content available.' };
      }

      if (name === 'list_active_jobs') {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('workspace_id', user.workspace_id)
          .eq('status', 'Open')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return keysToCamel(data || []);
      }

      if (name === 'list_companies') {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('workspace_id', user.workspace_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return keysToCamel(data || []);
      }

      if (name === 'get_workspace_tasks') {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', user.workspace_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return keysToCamel(data || []);
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
        const { data, error } = await supabase
          .from('candidates')
          .select('status')
          .eq('workspace_id', user.workspace_id);

        if (error) throw error;
        const summary: Record<string, number> = {};
        for (const c of data || []) {
          const stage = c.status || 'Pool';
          summary[stage] = (summary[stage] || 0) + 1;
        }
        return summary;
      }

      return { error: `Tool ${name} not found` };
    };
    const res = await run();
    return res;
  };

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

    const containsCompoundKeywords = /\band\b|\bthen\b|\balso\b|;/i.test(latestUserMessage);
    const isPotentiallyComplex = latestUserMessage.length > 100 && containsCompoundKeywords;
    if (isPotentiallyComplex) {
      try {
        const plannerSchema = {
          type: 'object',
          properties: {
            isMultiAgent: {
              type: 'boolean'
            },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  agent: { type: 'string', enum: ['SearchAgent', 'DBWriteAgent'] },
                  query: { type: 'string' }
                },
                required: ['agent', 'query']
              }
            }
          },
          required: ['isMultiAgent', 'tasks']
        };

        const plannerInstruction = `You are the Orchestrator Planner. Analyze the user's latest query and determine if it requires executing multiple independent sub-tasks in parallel (e.g. reading/matching candidates AND writing new tasks/jobs/companies). Output JSON matching the schema.`;
        const planText = await callLLM(plannerInstruction, latestUserMessage, 0.2, plannerSchema, signal);
        const parsedPlan = JSON.parse(planText.replace(/```json|```/g, '').trim());

        if (parsedPlan.isMultiAgent && Array.isArray(parsedPlan.tasks) && parsedPlan.tasks.length > 0) {
          useMultiAgent = true;
          subTasks = parsedPlan.tasks;
        }
      } catch (planErr: any) {
        console.error('[Copilot Orchestrator] Planner execution failed:', planErr.message);
      }
    }

    if (useMultiAgent) {
      console.log('[Copilot Orchestrator] Spawning sub-agents in parallel...');
      
      const subAgentOutputs = await Promise.all(subTasks.map(async (task) => {
        if (signal?.aborted) throw new Error('Task cancelled by user');

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

        let subMessages: any[] = [
          { role: 'system', content: agentSystemInstruction },
          { role: 'user', content: task.query }
        ];
        
        let subLoop = 0;
        let subContent = '';
        
        while (subLoop < 2) {
          if (signal?.aborted) throw new Error('Task cancelled by user');

          const res = await callEdenAIWithTools(subMessages, activeTools, signal);
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

      if (signal?.aborted) throw new Error('Task cancelled by user');
      
      const compilePrompt = `[System Orchestrator: Sub-agents have completed parallel execution. Here are their outputs:\n\n${subAgentOutputs.join('\n\n')}\n\nCombine these findings into a unified, supportive, friendly response. Keep your personality as Forge. If there are any proposed database actions (<action> blocks) in the sub-agent outputs, merge them and generate a single unified <action> block at the very end of your response.]`;

      let accumulatedResponse = '';
      const streamGenerator = callLLMStream(systemInstruction, compilePrompt, 0.7, undefined, signal);
      yield { type: 'assistant_message_start' };
      for await (const chunk of streamGenerator) {
        accumulatedResponse += chunk;
        yield { type: 'assistant_delta', content: chunk };
      }
      yield { type: 'assistant_message_end' };
      responseText = accumulatedResponse;
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
      let loopCount = 0;
      while (loopCount < 3) {
        if (signal?.aborted) throw new Error('Task cancelled by user');

        let rawMessage: any = { role: 'assistant', content: '' };
        const responseStream = callEdenAIWithToolsStream(transformMessagesForLLM(messagesForLLM), tools, signal);
        
        yield { type: 'assistant_message_start' };
        for await (const chunk of responseStream) {
          if (chunk.type === 'token') {
            rawMessage.content += chunk.content;
            yield { type: 'assistant_delta', content: chunk.content };
          } else if (chunk.type === 'tool_call') {
            rawMessage.tool_calls = chunk.content;
          }
        }
        yield { type: 'assistant_message_end' };

        if (!rawMessage.content && !rawMessage.tool_calls) {
          throw new Error('Invalid empty response received from completions API.');
        }

        if (rawMessage.tool_calls && rawMessage.tool_calls.length > 0) {
          messagesForLLM.push(rawMessage);

          for (const call of rawMessage.tool_calls) {
            let parsedArgs = {};
            try {
              parsedArgs = typeof call.function.arguments === 'string' 
                ? JSON.parse(call.function.arguments) 
                : call.function.arguments || {};
            } catch (e) {}

            if (signal?.aborted) throw new Error('Task cancelled by user');

            yield { type: 'tool_start', tool: call.function.name, args: parsedArgs };

            const toolOutput = await executeTool(call.function.name, parsedArgs);
            messagesForLLM.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(toolOutput)
            });

            yield { type: 'tool_complete', tool: call.function.name, result: toolOutput };
          }
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
                messagesForLLM.push({ role: 'assistant', content: responseText });
                messagesForLLM.push({ role: 'user', content: `[System Action Error: ${actionErr.message}]` });
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
              } catch (e) {}
            }
          }
          break;
        }
      }
    }

    const taskResult: any = { responseText: cleanedResponse };
    if (finalStatus === 'pending_approval') {
      taskResult.action = pendingActionData;
    }

    await supabase.from('copilot_tasks').upsert({
      id: taskId,
      status: finalStatus,
      result: taskResult,
      user_id: user?.id || null,
      current_step: null
    });

    if (finalStatus === 'pending_approval') {
      yield { type: 'approval_required', action: pendingActionData, text: cleanedResponse };
    } else {
      yield { type: 'completed', result: taskResult };
    }

  } catch (err: any) {
    console.error('Error in copilot task run:', err.message);
    
    try {
      await supabase.from('copilot_tasks').upsert({
        id: taskId,
        status: 'failed',
        error: err.message,
        user_id: user?.id || null,
        current_step: null
      });
    } catch (dbErr) {}

    yield { type: 'error', message: err.message };
  }
}

aiRouter.post('/copilot', requirePermission('copilot.open'), async (c) => {
  try {
    const { messages, autoExecute, clientTime } = await c.req.json();
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

- Current Date and Time: ${clientTime || new Date().toString()}
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
    "status": "Open"
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

    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache, no-transform');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no');

    return stream(c, async (stream) => {
      // Flush headers and establish stream connection immediately
      await stream.write(': ok\n\n');

      const abortController = new AbortController();
      stream.onAbort(() => {
        console.log(`[Copilot Stream] Client aborted connection for task ${taskId}. Aborting agent run.`);
        abortController.abort();
      });

      try {
        const agentStream = runCopilotAgent(
          taskId,
          messages,
          autoExecute,
          user,
          systemInstruction,
          tools,
          abortController.signal
        );

        for await (const event of agentStream) {
          if (abortController.signal.aborted) {
            break;
          }
          await stream.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (err: any) {
        console.error('[Copilot Stream] Streaming error:', err.message);
        if (!abortController.signal.aborted) {
          await stream.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        }
      }
    });
  } catch (err: any) {
    console.error('Error in copilot route:', err.message);
    return c.json({
      error: 'Failed to initiate AI Copilot.',
      details: err.message
    }, 500);
  }
});

// Approve Copilot Action Endpoint
aiRouter.post('/copilot/approve', requirePermission('copilot.open'), async (c) => {
  try {
    const { taskId, action } = await c.req.json();
    if (!taskId) {
      return c.json({ error: 'taskId is required' }, 400);
    }

    const actionJson = action;
    const user = c.get('user') as any;

    if (!actionJson || !user) {
      return c.json({ error: 'Direct action payload and authenticated user context must be provided.' }, 400);
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

    return c.json({ success: true, message: `Action '${command}' executed successfully.` });
  } catch (err: any) {
    console.error('Error executing approved copilot task action:', err.message);
    return c.json({ error: 'Failed to execute approved action.', details: err.message }, 500);
  }
});

// Job AI Tool Endpoint
aiRouter.post('/job-tool', requirePermission('jobs.ai_matching'), async (c) => {
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

    let systemInstruction = "You are an expert AI recruiter co-pilot.";
    let prompt = "";

    switch (toolKey) {
      case 'shortlist':
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
        systemInstruction = "You are a technical recruiter. Suggest supplementary tech stack skills.";
        prompt = `Based on the following job requirements:
Job Title: ${job.title}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Description: ${job.description}.
Suggest 4 high-value supplementary skills, libraries, or tools (not explicitly listed in the job) that would make an engineer highly successful in this role. Explain why for each.`;
        break;
      case 'difficulty':
        systemInstruction = "You are a talent acquisition strategist. Predict hiring market difficulty in India. Ensure any references to compensation or salaries are in Indian Rupees (INR, ₹) or LPA (Lakhs Per Annum).";
        prompt = `Predict the hiring difficulty (Easy, Medium, High) for the following job in the current tech market:
Job Title: ${job.title}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Salary: ${job.salary}
Location: ${job.location || 'India'}.
Provide a clear difficulty rating and 2-3 sentences explaining the market factors and recommendation strategies tailored for the Indian hiring ecosystem.`;
        break;
      case 'salary_recomm':
        systemInstruction = "You are an Indian compensation analyst. You must provide all salary benchmarks, percentiles, and recommendations in Indian Rupees (INR, ₹) and LPA (Lakhs Per Annum), tailored for the Indian tech market. Do not use US Dollars ($) or US salary standards.";
        prompt = `Provide market salary benchmarking advice for the following role:
Job Title: ${job.title}
Location: ${job.location || 'India'}
Salary: ${job.salary}.
List the estimated 25th, 50th (median), and 90th percentile market rates in INR (LPA), and give a recommendation on whether the current salary is competitive in the Indian tech market.`;
        break;
      case 'alt_skills':
        systemInstruction = "You are a sourcing agent. Provide alternative keywords/skills.";
        prompt = `For the following required skills list: ${JSON.stringify(job.requiredSkills || [])} of job ${job.title}, suggest equivalent or alternative skills, technologies, or keywords that recruiters should look for if the primary skills are scarce. Provide 3-4 suggestions.`;
        break;
      case 'candidate_email':
        systemInstruction = "You are an outreach copywriter. Draft a compelling cold email. Ensure any salary/compensation figures are in Indian Rupees (INR, ₹) or LPA.";
        prompt = `Write a professional, compelling candidate outreach email sequence template from a recruiter (${recruiterName}) inviting a candidate to apply for this job:
Job Title: ${job.title}
Company: ${job.companyName || 'None'}
Required Skills: ${JSON.stringify(job.requiredSkills || [])}
Salary: ${job.salary}.
Use [Candidate Name] as placeholder. Include subject line and body in markdown.`;
        break;
      case 'whatsapp_msg':
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
