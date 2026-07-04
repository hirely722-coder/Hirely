import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in your secrets or .env file.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust content generation helper with automatic model fallback and retry backoff to handle 503/429 high-demand spikes
async function generateContentWithFallback(
  ai: any,
  options: {
    contents: any;
    config?: any;
    defaultModel?: string;
  }
) {
  const modelsToTry = [
    options.defaultModel || 'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash'
  ];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const model = modelsToTry[mIdx];
    const maxRetries = 4;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting generateContent using model: ${model} (Attempt ${attempt}/${maxRetries})`);
        const response = await ai.models.generateContent({
          model: model,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || JSON.stringify(err);
        const isTransient = errMsg.includes('503') || 
                            errMsg.includes('500') || 
                            errMsg.includes('429') || 
                            errMsg.includes('UNAVAILABLE') || 
                            errMsg.includes('ResourceExhausted') ||
                            errMsg.includes('high demand') ||
                            errMsg.includes('overloaded') ||
                            errMsg.includes('spike') ||
                            errMsg.includes('temporarily');

        if (isTransient && attempt < maxRetries) {
          // Randomized exponential backoff: 1.5s, 3s, 4.5s... with a bit of jitter
          const delay = attempt * 1500 + Math.floor(Math.random() * 800);
          console.warn(`Model ${model} failed with transient error: ${errMsg}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.warn(`Model ${model} failed (Attempt ${attempt}/${maxRetries}): ${errMsg}`);
          if (mIdx < modelsToTry.length - 1) {
            console.log(`Falling back to next model in chain: ${modelsToTry[mIdx + 1]}`);
          }
          break; // Skip to the next model in the fallback chain
        }
      }
    }
  }

  throw lastError || new Error('All models failed to generate content.');
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Resume parser using Gemini JSON output (accepts either raw text, or base64 fileData with mimeType)
app.post('/api/ai/parse-resume', async (req, res) => {
  try {
    const { resumeText, fileData, mimeType } = req.body;
    if (!resumeText && !fileData) {
      return res.status(400).json({ error: 'Either resumeText or fileData/mimeType is required' });
    }

    const ai = getGeminiClient();

    let contents: any;
    const systemInstruction = `You are an expert AI resume parser. Extract the relevant fields from the provided resume text or document/image as accurately as possible.
If a field is not found, leave it empty or guess logically. For skills, extract all technical skills, programming languages, and frameworks.`;

    if (fileData && mimeType) {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType,
              data: fileData
            }
          },
          {
            text: "Extract candidate profile fields from this uploaded resume document or image. Provide a comprehensive plain-text summary or reconstruction of the entire resume under 'resumeTextSummary'."
          }
        ]
      };
    } else {
      contents = `Please extract candidate profile fields from the following resume text. Provide a comprehensive plain-text summary or reconstruction of the entire resume under 'resumeTextSummary':\n\n${resumeText}`;
    }

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Candidate full name' },
            email: { type: Type.STRING, description: 'Candidate email address' },
            phone: { type: Type.STRING, description: 'Candidate phone number' },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of technical skills, frameworks, and programming languages'
            },
            experience: { type: Type.STRING, description: 'Years or level of experience, e.g. "5 Years" or "Senior"' },
            education: { type: Type.STRING, description: 'Highest degree and school name' },
            currentCompany: { type: Type.STRING, description: 'Most recent company name' },
            address: { type: Type.STRING, description: 'Location, city and state' },
            resumeTextSummary: { type: Type.STRING, description: 'Comprehensive plain-text reconstruction or summary of the resume' }
          },
          required: ['name', 'email', 'phone', 'skills', 'experience', 'education', 'currentCompany', 'address', 'resumeTextSummary']
        }
      }
    });

    const parsedText = response.text || '{}';
    const parsedData = JSON.parse(parsedText);
    res.json({ data: parsedData });
  } catch (err: any) {
    console.error('Error in parse-resume route:', err.message);
    res.status(500).json({
      error: 'Failed to parse resume using Gemini. Please verify your GEMINI_API_KEY.',
      details: err.message
    });
  }
});

// AI Copilot Chat / Search Engine
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const ai = getGeminiClient();

    // Prepare system instructions with current ATS state to ground the model
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

    // Map client chat history to Gemini standard format
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ responseText: response.text });
  } catch (err: any) {
    console.error('Error in copilot route:', err.message);
    res.status(500).json({
      error: 'Failed to reach AI Copilot. Please verify your GEMINI_API_KEY.',
      details: err.message
    });
  }
});

// Vite & Static assets hosting logic
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
