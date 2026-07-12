import React, { useState, useRef, useEffect, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Plus, Mic, AudioLines, SendHorizontal, Square,
  Loader2, Trash2, ArrowRight, Paperclip, X, FileText, Zap, User, Brain
} from 'lucide-react';
import { Candidate, Job, Company, Task, EmailTemplate } from '../types';
import { supabase } from '../utils/supabase';
import { useApp } from '../context/AppContext';
import { processPdfFile } from '../utils/pdfParser';
import { 
  useExternalStoreRuntime, 
  AssistantRuntimeProvider, 
  type ThreadMessageLike,
  ComposerPrimitive,
  AuiIf
} from "@assistant-ui/react";
import { ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText } from './assistant-ui/reasoning';

interface CopilotViewProps {
  candidates: Candidate[];
  jobs: Job[];
  companies: Company[];
  tasks: Task[];
  templates: EmailTemplate[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: string[];
  isStreaming?: boolean;
  reasoningText?: string;   // Gemma 4 native chain-of-thought
  pendingAction?: {
    taskId: string;
    command: string;
    data: any;
    id?: string;
    status: 'pending' | 'approved' | 'rejected';
  };
}

const SUGGESTIONS = [
  "Find Python Developers",
  "Show Candidates with 5 Years Experience",
  "Match Candidates for Senior React Developer",
  "Create Follow-up Email for Clara Oswald",
  "Summarize Marcus Vance resume notes"
];

const FRIENDLY_TOOL_NAMES: Record<string, string> = {
  search_candidates: "Searching candidates...",
  get_candidate_resume: "Reading resume...",
  list_active_jobs: "Checking job openings...",
  list_companies: "Checking companies...",
  get_workspace_tasks: "Checking tasks...",
  get_pipeline_summary: "Analyzing pipelines...",
  get_custom_field_definitions: "Loading custom fields...",
};


// Helper Typewriter Component for streaming effects
interface TypewriterTextProps {
  content: string;
  onComplete: () => void;
}

function TypewriterText({ content, onComplete }: TypewriterTextProps) {
  const [index, setIndex] = React.useState(0);
  
  const tokens = React.useMemo(() => {
    return content.split(/(\s+)/).filter(Boolean);
  }, [content]);

  React.useEffect(() => {
    setIndex(0);
  }, [content]);

  React.useEffect(() => {
    if (tokens.length === 0) {
      onComplete();
      return;
    }

    if (index >= tokens.length) {
      onComplete();
      return;
    }

    const timeout = setTimeout(() => {
      setIndex((i) => i + 1);
    }, 20);

    return () => clearTimeout(timeout);
  }, [index, tokens, onComplete]);

  const displayText = React.useMemo(() => {
    return tokens.slice(0, index).join('');
  }, [tokens, index]);

  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {displayText}
      <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle bg-indigo-650 animate-pulse rounded-sm" />
    </p>
  );
}

// TooltipIconButton matches ChatGPT round styles with hover tooltips
interface TooltipIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip: string;
  children: React.ReactNode;
}

const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ tooltip, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`group relative h-9 w-9 flex items-center justify-center rounded-full text-[#5d5d5d] hover:bg-slate-105 dark:text-[#cdcdcd] dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 disabled:opacity-40 hover:scale-105 active:scale-95 ${className || ''}`}
        {...props}
      >
        {children}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-md z-50">
          {tooltip}
        </span>
      </button>
    );
  }
);
TooltipIconButton.displayName = 'TooltipIconButton';

// PrimaryAction manages the four states inside the composer
const PrimaryAction = ({ isLoading, isParsingFile, input, attachedFiles }: { isLoading: boolean; isParsingFile: boolean; input: string; attachedFiles: any[] }) => (
  <>
    <AuiIf condition={(s) => s.thread.isRunning}>
      <ComposerPrimitive.Cancel asChild>
        <TooltipIconButton tooltip="Cancel" aria-label="Cancel">
          <Square className="h-4 w-4 fill-current" />
        </TooltipIconButton>
      </ComposerPrimitive.Cancel>
    </AuiIf>
    <AuiIf condition={(s) => !s.thread.isRunning && s.composer.dictation != null}>
      <ComposerPrimitive.StopDictation asChild>
        <TooltipIconButton tooltip="Stop dictation" aria-label="Stop dictation">
          <Square className="h-4 w-4 fill-current" />
        </TooltipIconButton>
      </ComposerPrimitive.StopDictation>
    </AuiIf>
    <AuiIf
      condition={(s) =>
        !s.thread.isRunning && s.composer.dictation == null
      }
    >
      <ComposerPrimitive.Send asChild>
        <TooltipIconButton 
          tooltip="Send" 
          aria-label="Send" 
          className="bg-[#0d0d0d] text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 disabled:bg-[#f4f4f4] dark:disabled:bg-white/10 disabled:text-[#cccccc] dark:disabled:text-white/20"
          disabled={isLoading || isParsingFile || (!input.trim() && attachedFiles.length === 0)}
        >
          <SendHorizontal className="h-4.5 w-4.5" />
        </TooltipIconButton>
      </ComposerPrimitive.Send>
    </AuiIf>
  </>
);

// ChatGPT-style rounded Composer Component
const Composer = ({ 
  placeholder, 
  input, 
  setInput, 
  isLoading, 
  isParsingFile, 
  attachedFiles, 
  fileInputRef, 
  handleFileChange, 
  handleRemoveFile,
  handleSend,
  autoExecute,
  setAutoExecute,
  thinkingEnabled,
  setThinkingEnabled
}: { 
  placeholder: string;
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  isParsingFile: boolean;
  attachedFiles: any[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (idx: number) => void;
  handleSend: (text: string) => void;
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
  thinkingEnabled: boolean;
  setThinkingEnabled: (v: boolean) => void;
}) => (
  <div className="w-full max-w-2xl mx-auto space-y-3">
    <ComposerPrimitive.Root className="rounded-[28px] border border-[#e5e5e5] dark:border-[#2e2e2e] bg-white dark:bg-[#212121] p-3 shadow-sm flex flex-col w-full focus-within:shadow-md focus-within:border-slate-350 transition-all gap-2">
      {/* Attached files list inside the composer */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2 border-b border-slate-100 dark:border-white/5">
          {attachedFiles.map((file, idx) => {
            const isPdf = file.name.toLowerCase().endsWith('.pdf');
            const isCsv = file.name.toLowerCase().endsWith('.csv');
            
            return (
              <div key={idx} className="relative flex items-center gap-2.5 pl-3 pr-8 py-2 bg-slate-50 dark:bg-[#2b2b2b] border border-slate-150 dark:border-transparent rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-3xs group animate-fade-in max-w-[200px]">
                {file.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-650 shrink-0" />
                ) : (
                  <div className={`p-1 rounded-lg shrink-0 ${isPdf ? 'bg-red-50 text-red-650 dark:bg-red-950/40' : isCsv ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40' : 'bg-blue-50 text-blue-650 dark:bg-blue-950/40'}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                )}
                <div className="flex flex-col truncate pr-1">
                  <span className="truncate font-bold text-[10px] text-slate-700 dark:text-slate-300 leading-normal">{file.name}</span>
                  <span className="text-[8px] text-slate-400 font-bold tracking-wider leading-none mt-0.5 uppercase">
                    {file.isLoading ? 'Uploading...' : isPdf ? 'PDF Document' : isCsv ? 'Spreadsheet' : 'Text File'}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveFile(idx)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-250 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ComposerPrimitive.Input asChild>
        <textarea
          autoFocus 
          rows={1}
          placeholder={placeholder} 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(input);
            }
          }}
          disabled={isLoading || isParsingFile}
          className="w-full text-xs px-3 py-2 bg-transparent border-none focus:outline-none text-[#0d0d0d] dark:text-[#ececec] placeholder-slate-450 dark:placeholder-slate-400 font-medium resize-none min-h-[36px] max-h-[200px]"
        />
      </ComposerPrimitive.Input>

      <div className="flex items-center justify-between mt-1 px-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.csv,.pdf"
          />
          
          <ComposerPrimitive.AddAttachment asChild>
            <TooltipIconButton 
              tooltip="Add photos & files" 
              aria-label="Add attachment"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isParsingFile}
            >
              <Plus className="h-4.5 w-4.5" />
            </TooltipIconButton>
          </ComposerPrimitive.AddAttachment>

          {/* Sleek integrated pill toggle for Auto-Execute */}
          <button
            type="button"
            onClick={() => {
              const newVal = !autoExecute;
              setAutoExecute(newVal);
              localStorage.setItem('hirely_copilot_auto_execute', String(newVal));
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
              autoExecute 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-300 shadow-3xs border-indigo-200/50' 
                : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
            title="Auto-Execute Forge commands without asking"
          >
            <Zap className={`h-3 w-3 ${autoExecute ? 'fill-current animate-pulse' : ''}`} />
            <span>Auto-Run</span>
          </button>

          {/* Sleek integrated pill toggle for Thinking Mode */}
          <button
            type="button"
            onClick={() => {
              const newVal = !thinkingEnabled;
              setThinkingEnabled(newVal);
              localStorage.setItem('hirely_copilot_thinking_enabled', String(newVal));
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
              thinkingEnabled 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-300 shadow-3xs border-indigo-200/50' 
                : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
            title="Toggle Gemma 4 reasoning mode"
          >
            <Brain className="h-3 w-3" />
            <span>Thinking</span>
          </button>
        </div>
        
        <PrimaryAction 
          isLoading={isLoading} 
          isParsingFile={isParsingFile} 
          input={input} 
          attachedFiles={attachedFiles} 
        />
      </div>
    </ComposerPrimitive.Root>
  </div>
);

// Empty State matching ChatGPT's centered composition & styling
const EmptyState = ({ 
  input, 
  setInput, 
  isLoading, 
  isParsingFile, 
  attachedFiles, 
  fileInputRef, 
  handleFileChange, 
  handleRemoveFile,
  handleSend,
  autoExecute,
  setAutoExecute,
  thinkingEnabled,
  setThinkingEnabled
}: { 
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  isParsingFile: boolean;
  attachedFiles: any[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (idx: number) => void;
  handleSend: (text: string) => void;
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
  thinkingEnabled: boolean;
  setThinkingEnabled: (v: boolean) => void;
}) => (
  <div className="flex-1 flex flex-col justify-center items-center px-4 max-w-2xl mx-auto w-full text-center space-y-8 my-auto animate-fade-in">
    <div className="space-y-3">
      <h2 className="text-3xl font-normal text-[#0d0d0d] dark:text-[#ececec] font-sans tracking-tight flex items-center justify-center gap-2">
        Hey 👋 I am Forge.
      </h2>
    </div>

    <Composer 
      placeholder="Ask anything" 
      input={input}
      setInput={setInput}
      isLoading={isLoading}
      isParsingFile={isParsingFile}
      attachedFiles={attachedFiles}
      fileInputRef={fileInputRef}
      handleFileChange={handleFileChange}
      handleRemoveFile={handleRemoveFile}
      handleSend={handleSend}
      autoExecute={autoExecute}
      setAutoExecute={setAutoExecute}
      thinkingEnabled={thinkingEnabled}
      setThinkingEnabled={setThinkingEnabled}
    />

    {/* Grid of suggestions */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-full text-left">
      {SUGGESTIONS.slice(0, 4).map((sug, i) => (
        <button
          key={i}
          onClick={() => handleSend(sug)}
          disabled={isLoading}
          className="p-4 bg-white border border-[#e5e5e5] hover:border-slate-350 dark:border-transparent dark:bg-[#212121] dark:hover:bg-[#2d2d2d] text-left rounded-2xl transition-all flex flex-col justify-between group cursor-pointer shadow-3xs"
        >
          <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-650 dark:group-hover:text-indigo-400">{sug}</span>
          <span className="text-[9.5px] text-slate-400 mt-1 flex items-center gap-0.5 font-medium">
            Ask Forge
          </span>
        </button>
      ))}
    </div>
  </div>
);

// Main Component
export default function CopilotView({
  candidates,
  jobs,
  companies,
  tasks,
  templates
}: CopilotViewProps) {
  const { fetchData } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; text?: string; isLoading: boolean }[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  // Refs to prevent stale closures in assistant-ui bridged runtime callbacks
  const attachedFilesRef = useRef(attachedFiles);
  const handleSendRef = useRef<any>(null);

  attachedFilesRef.current = attachedFiles;

  // Bridged Runtime for assistant-ui
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message: Message): ThreadMessageLike => {
      const contentParts: any[] = [];
      // Prepend reasoning part if present — enables native ReasoningRoot
      if (message.reasoningText) {
        contentParts.push({ type: 'reasoning', text: message.reasoningText });
      }
      contentParts.push({ type: 'text', text: message.content });
      return {
        id: String(messages.indexOf(message)),
        role: message.role,
        content: contentParts as any,
      };
    },
    onNew: async (message) => {
      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (handleSendRef.current) {
        await handleSendRef.current(text);
      }
    },
  });

  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [autoExecute, setAutoExecute] = useState(false);
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<Array<{ label: string; reasoning: string; completed: boolean }>>([]);
  const [thinkingEnabled, setThinkingEnabled] = useState(true); // on/off toggle for Gemma 4 reasoning

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load saved chat history and autoExecute setting on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hirely_copilot_messages');
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved copilot messages:', e);
        }
      }
      const savedAuto = localStorage.getItem('hirely_copilot_auto_execute');
      if (savedAuto) {
        setAutoExecute(savedAuto === 'true');
      }
      const savedThinking = localStorage.getItem('hirely_copilot_thinking_enabled');
      if (savedThinking) {
        setThinkingEnabled(savedThinking === 'true');
      }
      setHasLoadedHistory(true);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (hasLoadedHistory && typeof window !== 'undefined') {
      localStorage.setItem('hirely_copilot_messages', JSON.stringify(messages));
    }
  }, [messages, hasLoadedHistory]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    setAttachedFiles(prev => [...prev, { name: file.name, isLoading: true }]);
    setIsParsingFile(true);

    try {
      let uploadFile: File | Blob = file;
      let uploadFileName = file.name;

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const parsedResult = await processPdfFile(file);
        uploadFile = parsedResult.file;
        uploadFileName = parsedResult.fileName;
      }

      const formData = new FormData();
      formData.append('file', uploadFile, uploadFileName);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/ai/parse-file', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error(`Server returned status ${response.status}: ${responseText || 'No response body'}`);
      }

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to parse file.');
      }

      setAttachedFiles(prev => 
        prev.map(f => f.name === file.name ? { name: file.name, text: result.text, isLoading: false } : f)
      );
    } catch (err: any) {
      console.error(err);
      alert(`Error reading file: ${err.message || 'Unknown error'}`);
      setAttachedFiles(prev => prev.filter(f => f.name !== file.name));
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    const currentAttachedFiles = attachedFilesRef.current;
    if (!text && currentAttachedFiles.length === 0) return;

    const userMsg: Message = { 
      role: 'user', 
      content: text || `Analyzed file: ${currentAttachedFiles.map(f => f.name).join(', ')}`,
      attachments: currentAttachedFiles.map(f => f.name)
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setCurrentTool(null);
    setThinkingSteps([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const context = {
        candidates,
        jobs,
        companies,
        tasks,
        templates
      };

      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m, idx) => {
            if (idx === updatedMessages.length - 1 && currentAttachedFiles.length > 0) {
              const fileContentBlock = currentAttachedFiles.map(f => 
                `[ATTACHED FILE: ${f.name}]\n${f.text}\n[END OF FILE: ${f.name}]`
              ).join('\n\n');
              return {
                role: m.role,
                content: `${fileContentBlock}\n\nUser Question:\n${m.content}`
              };
            }
            return {
              role: m.role,
              content: m.content
            };
          }),
          context,
          autoExecute,
          thinkingEnabled
        })
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to reach AI Copilot server.');
      }

      const { taskId } = result;

      const finalResult = (result.status === 'completed' || result.status === 'pending_approval')
        ? {
            responseText: result.result.responseText,
            action: result.result.action,
            pendingApproval: result.status === 'pending_approval'
          }
        : await new Promise<any>((resolve, reject) => {
            const checkStatus = async () => {
              try {
                const res = await fetch(`/api/ai/task-status/${taskId}`);
                const data = await res.json();
                if (data.status === 'completed' || data.status === 'pending_approval') {
                  resolve({
                    responseText: data.result?.responseText,
                    action: data.result?.action,
                    pendingApproval: data.status === 'pending_approval',
                    reasoningText: data.thinkingSteps?.map((s: any) => s.reasoning).filter(Boolean).join('\n\n') || undefined
                  });
                } else if (data.status === 'failed') {
                  reject(new Error(data.error || 'Task execution failed.'));
                } else {
                  // If running, set current tool label and thinking steps dynamically
                  if (data.current_step) {
                    setCurrentTool(data.current_step);
                  }
                  if (data.thinkingSteps && data.thinkingSteps.length > 0) {
                    setThinkingSteps(data.thinkingSteps);
                  }
                  setTimeout(checkStatus, 800);
                }
              } catch (e) {
                reject(e);
              }
            };
            checkStatus();
          });

      if (finalResult.pendingApproval) {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant' as const, 
            content: finalResult.responseText || 'Sorry, I couldn\'t formulate an answer.',
            pendingAction: {
              taskId,
              command: finalResult.action.command,
              data: finalResult.action.data,
              id: finalResult.action.id,
              status: 'pending' as const
            }
          }
        ]);
        await fetchData();
        return;
      }

      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant' as const, 
          content: finalResult.responseText || 'Sorry, I couldn\'t formulate an answer.',
          reasoningText: finalResult.reasoningText,
          isStreaming: true
        }
      ]);

      await fetchData();

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${err.message || 'Failed to contact Hirly Forge. Please make sure process.env.GEMINI_API_KEY is configured correctly.'}` }
      ]);
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  };
  handleSendRef.current = handleSend;

  const handleClear = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirely_copilot_messages', JSON.stringify([]));
    }
  };

  const handleApproveAction = async (taskId: string, messageIndex: number) => {
    setApprovingTaskId(taskId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const msg = messages[messageIndex];
      const action = msg?.pendingAction ? {
        command: msg.pendingAction.command,
        data: msg.pendingAction.data,
        id: msg.pendingAction.id
      } : undefined;

      const res = await fetch('/api/ai/copilot/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ taskId, action })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to approve task.');
      }

      setMessages(prev => 
        prev.map((msg, idx) => 
          idx === messageIndex && msg.pendingAction 
            ? { ...msg, pendingAction: { ...msg.pendingAction, status: 'approved' } }
            : msg
        )
      );

      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Approval error: ${err.message}`);
    } finally {
      setApprovingTaskId(null);
    }
  };

  const handleRejectAction = (messageIndex: number) => {
    setMessages(prev => 
      prev.map((msg, idx) => 
        idx === messageIndex && msg.pendingAction 
          ? { ...msg, pendingAction: { ...msg.pendingAction, status: 'rejected' } }
          : msg
      )
    );
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full bg-white dark:bg-black text-[#0d0d0d] dark:text-[#ececec] animate-fade-in" id="copilot-view">
        
        {/* Header controls */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 p-4 shrink-0 bg-white dark:bg-black">
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight font-sans flex items-center gap-1.5">
              <Zap className="h-5 w-5 text-indigo-650 animate-pulse" />
              Forge Console
            </h1>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Thinking Mode Toggle */}
            <button
              onClick={() => setThinkingEnabled(e => !e)}
              title={thinkingEnabled ? "Thinking mode ON — click to disable" : "Thinking mode OFF — click to enable"}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold border rounded-lg transition-colors uppercase tracking-wider cursor-pointer ${
                thinkingEnabled
                  ? 'border-indigo-400/40 text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                  : 'border-slate-200 dark:border-transparent text-slate-400 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
            >
              <Brain className="h-3 w-3" />
              {thinkingEnabled ? 'Thinking ON' : 'Thinking OFF'}
            </button>
            <button 
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold border border-slate-200 dark:border-transparent text-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-colors bg-white dark:bg-white/5 cursor-pointer uppercase tracking-wider"
            >
              <Trash2 className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        {/* Main Panel Layout */}
        <div className="flex-1 min-h-0 flex flex-col justify-between relative">
          {messages.length === 0 ? (
            <EmptyState 
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              isParsingFile={isParsingFile}
              attachedFiles={attachedFiles}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleRemoveFile={handleRemoveFile}
              handleSend={handleSend}
              autoExecute={autoExecute}
              setAutoExecute={setAutoExecute}
              thinkingEnabled={thinkingEnabled}
              setThinkingEnabled={setThinkingEnabled}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Viewport */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((m, idx) => {
                    const isAi = m.role === 'assistant';
                    return (
                      <div key={idx} className="space-y-4">
                        <div className={`flex items-start ${isAi ? 'justify-start' : 'justify-end'}`}>
                          {/* Content text */}
                          <div className={`text-xs leading-relaxed ${
                            isAi 
                              ? 'text-[#0d0d0d] dark:text-[#ececec] max-w-[85%] py-2' 
                              : 'max-w-[70%] rounded-[22px] bg-[#0d0d0d] px-4 py-2.5 text-white dark:bg-[#ececec] dark:text-[#0d0d0d] shadow-sm animate-fade-in'
                          }`}>
                            <div className="space-y-2">
                              {!isAi && m.attachments && m.attachments.length > 0 && (
                                <div className="flex flex-col gap-1.5 pb-2 mb-2 border-b border-white/15 dark:border-black/10">
                                  {m.attachments.map((fileName, fIdx) => (
                                    <div key={fIdx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 dark:bg-black/5 rounded-lg text-[10px] font-bold text-white dark:text-[#0d0d0d] border border-white/10 dark:border-black/10 max-w-[200px]">
                                      <FileText className="h-3.5 w-3.5 opacity-80" />
                                      <span className="truncate max-w-[140px]">{fileName}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Native Reasoning Panel — shows for completed messages */}
                              {isAi && m.reasoningText && (
                                <ReasoningRoot variant="outline" streaming={false} defaultOpen={false} className="mb-2">
                                  <ReasoningTrigger />
                                  <ReasoningContent>
                                    <ReasoningText>{m.reasoningText}</ReasoningText>
                                  </ReasoningContent>
                                </ReasoningRoot>
                              )}
                              {m.isStreaming ? (
                                <TypewriterText
                                  content={m.content}
                                  onComplete={() => {
                                    setMessages(prev => {
                                      const updated = [...prev];
                                      if (updated[idx]) {
                                        updated[idx] = { ...updated[idx], isStreaming: false };
                                      }
                                      return updated;
                                    });
                                  }}
                                />
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    strong: ({ children }) => (
                                      <strong className={isAi ? 'text-slate-950 dark:text-white font-semibold' : 'text-indigo-300 font-semibold'}>
                                        {children}
                                      </strong>
                                    ),
                                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                                    li: ({ children }) => <li className="pl-0.5">{children}</li>,
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto my-3 border border-slate-200/85 dark:border-white/10 rounded-lg shadow-3xs max-w-full">
                                        <table className="min-w-full divide-y divide-slate-250 dark:divide-white/10 text-[10px] sm:text-[11px] bg-white dark:bg-black">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children }) => <thead className="bg-slate-50/80 dark:bg-white/5 font-bold text-slate-700 dark:text-slate-300">{children}</thead>,
                                    th: ({ children }) => (
                                      <th className="px-3 py-2 border-b border-slate-250 dark:border-white/10 font-semibold text-slate-700 dark:text-slate-300 text-left whitespace-nowrap bg-slate-50 dark:bg-white/5">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-white/5 whitespace-nowrap align-middle max-w-[200px] truncate">
                                        {children}
                                      </td>
                                    ),
                                    tr: ({ children }) => (
                                      <tr className="hover:bg-slate-50/40 dark:hover:bg-white/5 transition-colors last:border-b-0">
                                        {children}
                                      </tr>
                                    )
                                  }}
                                >
                                  {m.content}
                                </ReactMarkdown>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Pending Action Card */}
                        {isAi && m.pendingAction && (
                          <div className="mt-2 p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/5 max-w-lg shadow-2xs font-sans text-slate-800 dark:text-slate-200 animate-fade-in">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-650 mb-2.5">
                              <Zap className="h-4 w-4 text-indigo-650" />
                              <span>Confirm Forge Command</span>
                            </div>
                            
                            <div className="bg-white dark:bg-black border border-slate-100 dark:border-white/10 rounded-lg p-4 text-xs shadow-3xs mb-3.5">
                              <div className="mb-3">
                                <span className="font-semibold text-slate-400">Action:</span>{' '}
                                <span className="font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/40 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                                  {m.pendingAction.command.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </div>
                              {m.pendingAction.data && typeof m.pendingAction.data === 'object' && (() => {
                                const data = m.pendingAction.data as Record<string, any>;
                                const fullWidthKeys = ['notes', 'description', 'requiredSkills', 'skills'];
                                const isInternalId = (key: string) => {
                                  const k = key.toLowerCase();
                                  return k === 'id' || k.endsWith('id');
                                };
                                const gridFields = Object.entries(data).filter(([key]) => !fullWidthKeys.includes(key) && !isInternalId(key));
                                const skills = data.skills || data.requiredSkills;
                                const notes = data.notes || data.description;

                                return (
                                  <div className="border-t border-slate-100 dark:border-white/10 pt-3.5 mt-2.5 space-y-3 text-[11px]">
                                    {gridFields.length > 0 && (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                                        {gridFields.map(([key, val]) => (
                                          <div key={key} className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                            </span>
                                            <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs leading-normal break-words">
                                              {String(val || '—')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {skills && (Array.isArray(skills) || typeof skills === 'string') && (
                                      <div className="flex flex-col gap-1.5 border-t border-slate-100/70 dark:border-white/10 pt-3">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                          Skills
                                        </span>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {(Array.isArray(skills) ? skills : String(skills).split(',')).map((sk: string, i: number) => {
                                            const skillTrimmed = sk.trim();
                                            if (!skillTrimmed) return null;
                                            return (
                                              <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-medium text-[10px] border border-slate-200 dark:border-transparent">
                                                {skillTrimmed}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {notes && (
                                      <div className="flex flex-col gap-1 border-t border-slate-100/70 dark:border-white/10 pt-3">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                          Notes / Details
                                        </span>
                                        <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed italic block mt-0.5 bg-slate-50 dark:bg-white/5 p-2.5 rounded border border-slate-100 dark:border-transparent whitespace-pre-wrap">
                                          {String(notes)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {m.pendingAction.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleApproveAction(m.pendingAction!.taskId, idx)}
                                    disabled={approvingTaskId !== null}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-40"
                                  >
                                    {approvingTaskId === m.pendingAction.taskId ? 'Executing...' : '✓ Approve & Run'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectAction(idx)}
                                    disabled={approvingTaskId !== null}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                  {m.pendingAction.status === 'approved' ? (
                                    <span className="text-emerald-600 flex items-center gap-1">
                                      ✓ Action executed successfully
                                    </span>
                                  ) : (
                                    <span className="text-slate-450 italic">
                                      ✗ Action rejected by user
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isLoading && (
                    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto my-6 px-4 animate-fade-in">
                      {/* Native Streaming ReasoningRoot — auto-opens while thinking, auto-collapses when done */}
                      {thinkingEnabled && thinkingSteps.length > 0 && (
                        <ReasoningRoot variant="outline" streaming={true}>
                          <ReasoningTrigger active={true} />
                          <ReasoningContent>
                            {thinkingSteps.map((step, i) => (
                              <div key={i} className="mb-3">
                                <p className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-wider mb-1">{step.label}</p>
                                <ReasoningText>{step.reasoning}</ReasoningText>
                              </div>
                            ))}
                          </ReasoningContent>
                        </ReasoningRoot>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Zap className="h-3.5 w-3.5 animate-pulse text-indigo-650" />
                        <span>
                          {currentTool ? (FRIENDLY_TOOL_NAMES[currentTool] || `Running ${currentTool}...`) : "Forge is thinking..."}
                        </span>
                      </div>
                      <div className="space-y-2.5 w-full">
                        <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full w-3/4 animate-pulse" />
                        <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full w-1/2 animate-pulse" />
                        <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full w-5/6 animate-pulse" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Viewport Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-black p-4 shrink-0">
                <div className="max-w-3xl mx-auto space-y-2">
                  <Composer 
                    placeholder="Ask anything" 
                    input={input}
                    setInput={setInput}
                    isLoading={isLoading}
                    isParsingFile={isParsingFile}
                    attachedFiles={attachedFiles}
                    fileInputRef={fileInputRef}
                    handleFileChange={handleFileChange}
                    handleRemoveFile={handleRemoveFile}
                    handleSend={handleSend}
                    autoExecute={autoExecute}
                    setAutoExecute={setAutoExecute}
                    thinkingEnabled={thinkingEnabled}
                    setThinkingEnabled={setThinkingEnabled}
                  />
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1 font-medium">
                    Forge can make mistakes. Verify important information.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
