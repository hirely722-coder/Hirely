import { EventEmitter } from 'events';
import { supabase } from '../db';

// Security Helper: Log AI Requests to Database for analytics
export async function logAIRequest(
  user: any,
  feature: string,
  provider: string,
  tokenUsage: number,
  cost: number,
  responseTimeMs: number,
  status: 'Success' | 'Failure'
) {
  try {
    await supabase.from('superadmin_ai_logs').insert([{
      workspace_id: user?.workspace_id || null,
      agency_id: user?.workspace_id || null,
      user_id: user?.id || null,
      feature,
      provider,
      token_usage: tokenUsage,
      cost,
      response_time_ms: responseTimeMs,
      status
    }]);
  } catch (err: any) {
    console.error('[AI Log Helper] Failed to insert log to DB:', err.message);
  }
}

// Unified call to Eden AI
export async function callLLM(
  systemInstruction: string,
  promptContent: any,
  temperature: number = 0.7,
  responseSchema?: any,
  signal?: AbortSignal
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
    }),
    signal
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

export async function* callLLMStream(
  systemInstruction: string,
  promptContent: any,
  temperature: number = 0.7,
  responseSchema?: any,
  signal?: AbortSignal
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
    }),
    signal
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

export async function callEdenAIWithTools(
  messages: any[],
  tools: any[],
  signal?: AbortSignal
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
    }),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
  }

  return await response.json();
}

export async function* callEdenAIWithToolsStream(
  messages: any[],
  tools: any[],
  signal?: AbortSignal
): AsyncGenerator<{ type: 'token'; content: string } | { type: 'tool_call'; content: any }, void, unknown> {
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
      temperature: 0.7,
      stream: true
    }),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eden AI API returned status ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedToolCalls: any[] = [];

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
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.tool_calls) {
              for (const call of delta.tool_calls) {
                const idx = call.index ?? 0;
                if (!accumulatedToolCalls[idx]) {
                  accumulatedToolCalls[idx] = {
                    id: call.id,
                    type: 'function',
                    function: { name: call.function?.name, arguments: '' }
                  };
                }
                if (call.function?.arguments) {
                  accumulatedToolCalls[idx].function.arguments += call.function.arguments;
                }
              }
            } else if (delta.content) {
              yield { type: 'token', content: delta.content };
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

  const finalToolCalls = accumulatedToolCalls.filter(Boolean);
  if (finalToolCalls.length > 0) {
    yield { type: 'tool_call', content: finalToolCalls };
  }
}

// Global event emitter for streaming response tokens to client SSE route
export const streamEmitter = new EventEmitter();

// Memory store for background LLM tasks
export interface BackgroundTask {
  status: 'pending' | 'completed' | 'failed' | 'pending_approval' | 'streaming' | 'cancelled';
  currentStep?: { name: string; args: any };
  result?: any;
  error?: string;
  user?: any;
}
