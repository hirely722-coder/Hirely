import React, { useState, useRef, useEffect, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus, Mic, AudioLines, SendHorizontal, Square,
  Loader2, Trash2, ArrowRight, Paperclip, X, FileText, Zap, User, Check,
  Copy, PenLine
} from 'lucide-react';
import { Candidate, Job, Company, Task, EmailTemplate } from '../types';
import { supabase } from '../utils/supabase';
import { SpeechProvider, WebSpeechProvider, ProviderDictationAdapter } from '../utils/speechProvider';
import { useApp } from '../context/AppContext';
import { processPdfFile } from '../utils/pdfParser';
import {
  useExternalStoreRuntime,
  AssistantRuntimeProvider,
  type ThreadMessageLike,
  ComposerPrimitive,
  AuiIf,
  useComposer
} from "@assistant-ui/react";

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
  isSse?: boolean;
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

const STATUS_SEQUENCES: Record<string, string[]> = {
  thinking: [
    "Forge is thinking..."
  ],
  search_candidates: [
    "Searching candidate database",
    "Filtering profiles by criteria",
    "Analyzing applicant matches"
  ],
  get_candidate_resume: [
    "Reading resume documents",
    "Extracting experience and skills",
    "Evaluating candidate profile"
  ],
  list_active_jobs: [
    "Checking active job openings",
    "Reviewing job descriptions",
    "Gathering position details"
  ],
  list_companies: [
    "Retrieving company records",
    "Accessing directory details"
  ],
  get_workspace_tasks: [
    "Reviewing active task list",
    "Checking schedule and priorities"
  ],
  get_pipeline_summary: [
    "Analyzing pipeline stages",
    "Compiling recruitment statistics"
  ],
  get_custom_field_definitions: [
    "Reading custom workspace fields",
    "Loading data schema configurations"
  ]
};

const extractToolName = (step: string | null): string => {
  if (!step) return 'thinking';
  const cleanStep = step.toLowerCase();
  for (const tool of Object.keys(STATUS_SEQUENCES)) {
    if (cleanStep.includes(tool)) {
      return tool;
    }
  }
  return 'thinking';
};

const cleanMarkdownContent = (text: string): string => {
  return text.replace(/<action>[\s\S]*?(<\/action>|$)/g, '').trim();
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

// PrimaryAction manages the states inside the composer using assistant-ui's native primitives
const PrimaryAction = ({
  isLoading,
  isParsingFile,
  attachedFiles
}: {
  isLoading: boolean;
  isParsingFile: boolean;
  attachedFiles: any[];
}) => {
  const composerText = useComposer((c) => c.text);
  const isSendDisabled = isLoading || isParsingFile || (!composerText.trim() && attachedFiles.length === 0);

  return (
    <div className="flex items-center gap-1.5">
      {/* Pluggable Mic Button (Dictate) - shown when not running and not dictating */}
      <AuiIf condition={(s) => !s.thread.isRunning && s.composer.dictation == null}>
        <ComposerPrimitive.Dictate asChild>
          <TooltipIconButton tooltip="Start dictation" aria-label="Start dictation">
            <Mic className="h-4.5 w-4.5" />
          </TooltipIconButton>
        </ComposerPrimitive.Dictate>
      </AuiIf>

      {/* Cancel Button - shown when thread is running */}
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <TooltipIconButton tooltip="Cancel" aria-label="Cancel">
            <Square className="h-4 w-4 fill-current" />
          </TooltipIconButton>
        </ComposerPrimitive.Cancel>
      </AuiIf>

      {/* Send Button - shown when thread is not running and not dictating */}
      <AuiIf condition={(s) => !s.thread.isRunning && s.composer.dictation == null}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send"
            aria-label="Send"
            className="bg-[#0d0d0d] text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 disabled:bg-[#f4f4f4] dark:disabled:bg-white/10 disabled:text-[#cccccc] dark:disabled:text-white/20"
            disabled={isSendDisabled}
          >
            <SendHorizontal className="h-4.5 w-4.5" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
    </div>
  );
};

// ChatGPT-style rounded Composer Component
const Composer = ({
  placeholder,
  isLoading,
  isParsingFile,
  attachedFiles,
  fileInputRef,
  handleFileChange,
  handleRemoveFile,
  autoExecute,
  setAutoExecute,
  handleCancelDictation
}: {
  placeholder: string;
  isLoading: boolean;
  isParsingFile: boolean;
  attachedFiles: any[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (idx: number) => void;
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
  handleCancelDictation: () => void;
}) => {
  const isDictating = useComposer((c) => c.dictation != null);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Self-contained styling for the voice waveform animations */}
      <style>{`
        @keyframes voice-wave {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        .animate-voice-bar-1 { animation: voice-wave 0.8s infinite ease-in-out; }
        .animate-voice-bar-2 { animation: voice-wave 0.8s infinite ease-in-out 0.15s; }
        .animate-voice-bar-3 { animation: voice-wave 0.8s infinite ease-in-out 0.3s; }
        .animate-voice-bar-4 { animation: voice-wave 0.8s infinite ease-in-out 0.45s; }
        .animate-voice-bar-5 { animation: voice-wave 0.8s infinite ease-in-out 0.6s; }
      `}</style>

      <ComposerPrimitive.Root className="rounded-[28px] border border-[#e5e5e5] dark:border-[#2e2e2e] bg-white dark:bg-[#212121] p-3 shadow-sm flex flex-col w-full focus-within:shadow-md focus-within:border-slate-350 transition-all gap-2 min-h-[54px] justify-center">
        {isDictating ? (
          <div className="flex items-center justify-between w-full py-1 px-2 animate-fade-in">
            {/* Cancel Action (Left) */}
            <button
              type="button"
              onClick={handleCancelDictation}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 hover:text-red-500 transition-colors cursor-pointer shrink-0"
              title="Cancel dictation"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Waveform & Transcript (Center) */}
            <div className="flex-1 flex items-center gap-4 overflow-hidden mx-4 text-left">
              {/* Audio Waveform Activity Visualizer */}
              <div className="flex items-center gap-1 h-6 shrink-0">
                <div className="w-1 bg-[#0d0d0d] dark:bg-white rounded-full animate-voice-bar-1" />
                <div className="w-1 bg-[#0d0d0d] dark:bg-white rounded-full animate-voice-bar-2" />
                <div className="w-1 bg-[#0d0d0d] dark:bg-white rounded-full animate-voice-bar-3" />
                <div className="w-1 bg-[#0d0d0d] dark:bg-white rounded-full animate-voice-bar-4" />
                <div className="w-1 bg-[#0d0d0d] dark:bg-white rounded-full animate-voice-bar-5" />
              </div>
              {/* Real-time transcript preview */}
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate flex-1 leading-normal italic select-none">
                <ComposerPrimitive.DictationTranscript />
              </div>
            </div>

            {/* Accept / Stop Action (Right) */}
            <ComposerPrimitive.StopDictation asChild>
              <button
                type="button"
                className="p-2 bg-[#0d0d0d] hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-black rounded-full transition-all cursor-pointer shadow-sm scale-105"
                title="Accept dictation"
              >
                <Check className="h-5 w-5" />
              </button>
            </ComposerPrimitive.StopDictation>
          </div>
        ) : (
          <>
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${autoExecute
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-300 shadow-3xs border-indigo-200/50'
                    : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  title="Auto-Execute Forge commands without asking"
                >
                  <Zap className={`h-3 w-3 ${autoExecute ? 'fill-current animate-pulse' : ''}`} />
                  <span>Auto-Run</span>
                </button>
              </div>

              <PrimaryAction
                isLoading={isLoading}
                isParsingFile={isParsingFile}
                attachedFiles={attachedFiles}
              />
            </div>
          </>
        )}
      </ComposerPrimitive.Root>
    </div>
  );
};

interface MessageItemProps {
  m: Message;
  idx: number;
  handleApproveAction: (taskId: string, messageIndex: number) => Promise<void>;
  handleRejectAction: (messageIndex: number) => void;
  approvingTaskId: string | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  candidates: Candidate[];
  jobs: Job[];
  companies: Company[];
  tasks: Task[];
  templates: EmailTemplate[];
  handleSend: (text: string, editIndex?: number) => Promise<void>;
}

const MessageItem = ({
  m,
  idx,
  handleApproveAction,
  handleRejectAction,
  approvingTaskId,
  messages,
  setMessages,
  candidates,
  jobs,
  companies,
  tasks,
  templates,
  handleSend,
}: MessageItemProps) => {
  const isAi = m.role === 'assistant';
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [editText, setEditText] = useState(m.content);
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setEditText(m.content);
  }, [m.content]);

  const handleCopy = async () => {
    try {
      const text = m.content;
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="space-y-4"
    >
      <div className={`flex items-start ${isAi ? 'justify-start' : 'justify-end'}`}>
        {/* Content text */}
        <div className={`text-xs leading-relaxed ${isAi
          ? 'text-[#0d0d0d] dark:text-[#ececec] max-w-[85%] py-2'
          : 'max-w-[70%] rounded-[22px] bg-[#0d0d0d] px-4 py-2.5 text-white dark:bg-[#ececec] dark:text-[#0d0d0d] shadow-sm animate-fade-in'
          }`}>
          {isEditingLocal ? (
            <div className="w-full flex flex-col gap-2 mt-1">
              <textarea
                className="w-full min-w-[250px] bg-transparent border-0 outline-hidden resize-none text-white dark:text-[#0d0d0d] placeholder:text-slate-400 focus:ring-0 focus:outline-hidden min-h-[75px]"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (editText.trim()) {
                      handleSend(editText, idx);
                      setIsEditingLocal(false);
                    }
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsEditingLocal(false)}
                  className="px-2.5 py-1 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border border-white/10 dark:border-black/10 text-white dark:text-[#0d0d0d] rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (editText.trim()) {
                      await handleSend(editText, idx);
                      setIsEditingLocal(false);
                    }
                  }}
                  disabled={!editText.trim()}
                  className="px-3 py-1 bg-white dark:bg-black hover:bg-white/90 dark:hover:bg-black/90 text-[#0d0d0d] dark:text-white rounded-lg cursor-pointer transition-all disabled:opacity-40"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
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
              {m.isStreaming && !m.isSse ? (
                <TypewriterText
                  content={cleanMarkdownContent(m.content)}
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
                  {cleanMarkdownContent(m.content)}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message action bar (Edit/Copy) */}
      {!isEditingLocal && m.content && (
        <div className={`flex ${isAi ? 'justify-start' : 'justify-end'} gap-1.5 mt-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {!isAi && (
            <button
              onClick={() => setIsEditingLocal(true)}
              className="p-1 text-slate-400 hover:text-slate-650 dark:text-neutral-500 dark:hover:text-neutral-300 rounded cursor-pointer transition-colors"
              title="Edit prompt"
            >
              <PenLine className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-650 dark:text-neutral-500 dark:hover:text-neutral-300 rounded cursor-pointer transition-colors"
            title="Copy response"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

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
};

// Empty State matching ChatGPT's centered composition & styling
const EmptyState = ({

  isLoading,
  isParsingFile,
  attachedFiles,
  fileInputRef,
  handleFileChange,
  handleRemoveFile,
  handleSend,
  autoExecute,
  setAutoExecute,
  handleCancelDictation
}: {
  isLoading: boolean;
  isParsingFile: boolean;
  attachedFiles: any[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (idx: number) => void;
  handleSend: (text: string) => void;
  autoExecute: boolean;
  setAutoExecute: (v: boolean) => void;
  handleCancelDictation: () => void;
}) => (
  <div className="flex-1 flex flex-col justify-center items-center px-4 max-w-2xl mx-auto w-full text-center space-y-8 my-auto animate-fade-in">
    <div className="space-y-3">
      <h2 className="text-3xl font-normal text-[#0d0d0d] dark:text-[#ececec] font-sans tracking-tight flex items-center justify-center gap-2">
        Hey 👋 I am Forge.
      </h2>
    </div>

    <Composer
      placeholder="Ask anything"
      isLoading={isLoading}
      isParsingFile={isParsingFile}
      attachedFiles={attachedFiles}
      fileInputRef={fileInputRef}
      handleFileChange={handleFileChange}
      handleRemoveFile={handleRemoveFile}
      autoExecute={autoExecute}
      setAutoExecute={setAutoExecute}
      handleCancelDictation={handleCancelDictation}
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
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingStarted, setIsStreamingStarted] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; text?: string; isLoading: boolean }[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  // Smooth streaming typewriter variables
  const incomingTextRef = React.useRef('');
  const displayedTextRef = React.useRef('');
  const typingTimerRef = React.useRef<any>(null);
  const isStreamingActiveRef = React.useRef(false);

  // Cancellation and Stream Control Refs
  const activeEventSourceRef = React.useRef<EventSource | null>(null);
  const activeFetchControllerRef = React.useRef<AbortController | null>(null);
  const pollingTimeoutRef = React.useRef<any>(null);
  const activeTaskIdRef = React.useRef<string | null>(null);
  const isCancelledRef = React.useRef(false);

  // Voice Dictation Refs
  const speechProviderRef = useRef<SpeechProvider>(new WebSpeechProvider());

  // Smooth Typewriter interval loop (runs every 25ms to pull from buffer)
  const startTypingLoop = React.useCallback(() => {
    if (typingTimerRef.current) return;
    isStreamingActiveRef.current = true;

    const tick = () => {
      const target = incomingTextRef.current;
      const current = displayedTextRef.current;

      if (!isStreamingActiveRef.current && current === target) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        return;
      }

      if (current.length < target.length) {
        const remaining = target.length - current.length;
        // Dynamically scale step size: 2 chars baseline, 5 if lagging, 15 if heavily lagging
        const step = remaining > 100 ? 15 : (remaining > 30 ? 5 : 2);
        const nextText = current + target.slice(current.length, current.length + step);

        displayedTextRef.current = nextText;
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && last.isStreaming) {
            return [
              ...next.slice(0, -1),
              { ...last, content: nextText }
            ];
          }
          return next;
        });
      }
    };

    typingTimerRef.current = setInterval(tick, 25);
  }, []);

  const stopTypingLoop = React.useCallback(() => {
    isStreamingActiveRef.current = false;
  }, []);

  React.useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
      speechProviderRef.current.stop(); // Stop recording on unmount
    };
  }, []);

  // Stop/Cancel handler for assistant-ui and manual Stop button
  const handleCancel = async () => {
    isCancelledRef.current = true;
    speechProviderRef.current.stop(); // Stop voice recording if active

    // 1. Abort active fetch stream
    if (activeFetchControllerRef.current) {
      activeFetchControllerRef.current.abort();
      activeFetchControllerRef.current = null;
    }

    // 2. Close EventSource connection (if any remains)
    if (activeEventSourceRef.current) {
      activeEventSourceRef.current.close();
      activeEventSourceRef.current = null;
    }

    // 3. Clear polling timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // 4. Stop typewriter animation loop
    stopTypingLoop();
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    activeTaskIdRef.current = null;

    // 5. Update UI to idle state with partial responses remaining visible
    setIsLoading(false);
    setCurrentTool(null);

    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === 'assistant' && last.isStreaming) {
        return [
          ...next.slice(0, -1),
          {
            ...last,
            content: displayedTextRef.current || 'Generation cancelled.',
            isStreaming: false,
            isSse: false
          }
        ];
      }
      return next;
    });
  };

  // Refs to prevent stale closures in assistant-ui bridged runtime callbacks
  const attachedFilesRef = useRef(attachedFiles);
  const handleSendRef = useRef<any>(null);
  const handleCancelRef = useRef<any>(null);

  attachedFilesRef.current = attachedFiles;
  handleCancelRef.current = handleCancel;

  // Bridged Runtime for assistant-ui
  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: isLoading,
    onCancel: async () => {
      if (handleCancelRef.current) {
        await handleCancelRef.current();
      }
    },
    adapters: {
      dictation: new ProviderDictationAdapter(speechProviderRef.current),
    },
    convertMessage: (message: Message): ThreadMessageLike => ({
      id: String(messages.indexOf(message)),
      role: message.role,
      content: [{ type: "text", text: message.content }],
    }),
    onNew: async (message) => {
      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      if (handleSendRef.current) {
        await handleSendRef.current(text);
      }
    },
    onEdit: async (message) => {
      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const idx = Number(message.parentId);
      if (handleSendRef.current) {
        await handleSendRef.current(text, idx);
      }
    },
  });

  // Refs to manage ChatGPT voice composer dictation cancellation state
  const originalTextRef = useRef('');
  const wasDictatingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = runtime.thread.composer.subscribe(() => {
      const state = runtime.thread.composer.getState();
      const isCurrentlyDictating = state.dictation != null;
      if (isCurrentlyDictating && !wasDictatingRef.current) {
        originalTextRef.current = state.text;
      }
      wasDictatingRef.current = isCurrentlyDictating;
    });
    return unsubscribe;
  }, [runtime]);

  const handleCancelDictation = () => {
    runtime.thread.composer.stopDictation();
    runtime.thread.composer.setText(originalTextRef.current);
  };

  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [friendlyStatus, setFriendlyStatus] = useState("Analyzing your request");

  useEffect(() => {
    if (!isLoading) {
      setFriendlyStatus("Analyzing your request");
      return;
    }

    const toolKey = extractToolName(currentTool);
    const sequence = STATUS_SEQUENCES[toolKey] || STATUS_SEQUENCES.thinking;

    let index = 0;
    setFriendlyStatus(sequence[0]);

    const interval = setInterval(() => {
      index = (index + 1) % sequence.length;
      setFriendlyStatus(sequence[index]);
    }, 2500);

    return () => clearInterval(interval);
  }, [currentTool, isLoading]);
  const [autoExecute, setAutoExecute] = useState(false);
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || ''}/api/ai/parse-file`, {
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

  const handleSend = async (textToSend: string, editIndex?: number) => {
    speechProviderRef.current.stop(); // Stop voice recording when sending
    isCancelledRef.current = false;
    const text = textToSend.trim();
    const currentAttachedFiles = attachedFilesRef.current;
    if (editIndex === undefined && !text && currentAttachedFiles.length === 0) return;
    if (editIndex !== undefined && !text) return;

    incomingTextRef.current = '';
    displayedTextRef.current = '';
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    let updatedMessages: Message[];
    if (editIndex !== undefined) {
      const truncated = messages.slice(0, editIndex);
      const editedUserMsg: Message = {
        role: 'user',
        content: text,
        attachments: []
      };
      updatedMessages = [...truncated, editedUserMsg];
    } else {
      const userMsg: Message = {
        role: 'user',
        content: text || `Analyzed file: ${currentAttachedFiles.map(f => f.name).join(', ')}`,
        attachments: currentAttachedFiles.map(f => f.name)
      };
      updatedMessages = [...messages, userMsg];
    }

    setMessages(updatedMessages);
    setAttachedFiles([]);
    setIsLoading(true);
    setIsStreamingStarted(false);
    setCurrentTool(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const abortController = new AbortController();
      activeFetchControllerRef.current = abortController;

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || ''}/api/ai/copilot`, {
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
          autoExecute,
          clientTime: new Date().toString()
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        let errText = 'Failed to reach AI Copilot server.';
        try {
          const errData = await response.json();
          if (errData && errData.error) errText = errData.error;
        } catch (e) {}
        throw new Error(errText);
      }

      if (isCancelledRef.current) return;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (isCancelledRef.current) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'assistant_message_start') {
                incomingTextRef.current = '';
                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === 'assistant' && last.isStreaming) {
                    return next;
                  } else {
                    return [
                      ...next,
                      { role: 'assistant', content: '', isStreaming: true, isSse: true }
                    ];
                  }
                });
                startTypingLoop();
              } else if (data.type === 'assistant_delta') {
                incomingTextRef.current += data.content || '';
                setIsStreamingStarted(true);
              } else if (data.type === 'tool_start') {
                setCurrentTool(data.tool);
              } else if (data.type === 'tool_complete') {
                // Done tool
              } else if (data.type === 'approval_required') {
                stopTypingLoop();
                await new Promise<void>((resolveTypewriter) => {
                  const check = () => {
                    if (displayedTextRef.current === incomingTextRef.current) {
                      resolveTypewriter();
                    } else {
                      setTimeout(check, 50);
                    }
                  };
                  check();
                });

                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  const actionMsg = {
                    role: 'assistant' as const,
                    content: data.text || incomingTextRef.current || 'Sorry, I couldn\'t formulate an answer.',
                    pendingAction: {
                      taskId: 'direct_action_' + Date.now(),
                      command: data.action.command,
                      data: data.action.data,
                      id: data.action.id,
                      status: 'pending' as const
                    }
                  };
                  if (last && last.role === 'assistant' && last.isStreaming) {
                    return [...next.slice(0, -1), actionMsg];
                  } else {
                    return [...next, actionMsg];
                  }
                });
                setIsLoading(false);
                setCurrentTool(null);
                await fetchData();
                return;

              } else if (data.type === 'completed') {
                stopTypingLoop();
                await new Promise<void>((resolveTypewriter) => {
                  const check = () => {
                    if (displayedTextRef.current === incomingTextRef.current) {
                      resolveTypewriter();
                    } else {
                      setTimeout(check, 50);
                    }
                  };
                  check();
                });

                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  const finalMsg = {
                    role: 'assistant' as const,
                    content: data.result?.responseText || incomingTextRef.current || 'Sorry, I couldn\'t formulate an answer.',
                    isStreaming: false,
                    isSse: false
                  };
                  if (last && last.role === 'assistant' && last.isStreaming) {
                    return [...next.slice(0, -1), finalMsg];
                  } else {
                    return [...next, finalMsg];
                  }
                });
                setIsLoading(false);
                setCurrentTool(null);
                await fetchData();
                return;

              } else if (data.type === 'error') {
                throw new Error(data.message || 'Stream processing failed.');
              }
            } catch (err) {
              console.error('Error parsing streaming event:', err);
            }
          }
        }
      }

      setIsLoading(false);
      setCurrentTool(null);
      await fetchData();

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${err.message || 'Failed to contact Hirly Forge.'}` }
      ]);
    } finally {
      setIsLoading(false);
      setIsStreamingStarted(false);
      setCurrentTool(null);
      activeTaskIdRef.current = null;
      activeFetchControllerRef.current = null;
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

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || ''}/api/ai/copilot/approve`, {
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
              isLoading={isLoading}
              isParsingFile={isParsingFile}
              attachedFiles={attachedFiles}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleRemoveFile={handleRemoveFile}
              handleSend={handleSend}
              autoExecute={autoExecute}
              setAutoExecute={setAutoExecute}
              handleCancelDictation={handleCancelDictation}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Viewport */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.map((m, idx) => {
                    if (m.role === 'assistant' && !m.content && m.isStreaming) {
                      return null;
                    }
                    return (
                      <MessageItem
                        key={idx}
                        m={m}
                        idx={idx}
                        handleApproveAction={handleApproveAction}
                        handleRejectAction={handleRejectAction}
                        approvingTaskId={approvingTaskId}
                        messages={messages}
                        setMessages={setMessages}
                        candidates={candidates}
                        jobs={jobs}
                        companies={companies}
                        tasks={tasks}
                        templates={templates}
                        handleSend={handleSend}
                      />
                    );
                  })}

                  {isLoading && !isStreamingStarted && (
                    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto my-6 px-4 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Zap className="h-3.5 w-3.5 animate-pulse text-indigo-650" />
                        <span>
                          {friendlyStatus}
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
                    isLoading={isLoading}
                    isParsingFile={isParsingFile}
                    attachedFiles={attachedFiles}
                    fileInputRef={fileInputRef}
                    handleFileChange={handleFileChange}
                    handleRemoveFile={handleRemoveFile}
                    autoExecute={autoExecute}
                    setAutoExecute={setAutoExecute}
                    handleCancelDictation={handleCancelDictation}
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
