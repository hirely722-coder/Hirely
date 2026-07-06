import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Send, Loader2, Bot, User, Trash2, Search, ArrowRight, HelpCircle, Paperclip, X, FileText, ChevronRight } from 'lucide-react';
import { Candidate, Job, Company, Task, EmailTemplate } from '../types';
import { supabase } from '../utils/supabase';
import { useApp } from '../context/AppContext';

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
    setIndex(0); // Reset typing animation if content changes
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
    }, 20); // Smooth 20ms per token step

    return () => clearTimeout(timeout);
  }, [index, tokens, onComplete]);

  const displayText = React.useMemo(() => {
    return tokens.slice(0, index).join('');
  }, [tokens, index]);

  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {displayText}
      <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle bg-blue-600 animate-pulse rounded-sm" />
    </p>
  );
}

export default function CopilotView({
  candidates,
  jobs,
  companies,
  tasks,
  templates
}: CopilotViewProps) {
  const { fetchData } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI recruiting copilot. I am connected directly to your ATS.

You can ask me to:
- **Search or find candidates** with specific skills (e.g., "Find Python developers" or "Candidates with 5 years experience")
- **Match talent** to active vacancies (e.g., "Match candidates for Senior React Developer")
- **Generate emails** (e.g., "Create a follow-up email for Clara Oswald")
- **Summarize logs and resumes**

How can I speed up your recruiting workflow today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; text?: string; isLoading: boolean }[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<{ name: string; args: any } | null>(null);
  const [showStepDetails, setShowStepDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    
    // Instantly show the file badge in the UI with a spinner
    setAttachedFiles(prev => [...prev, { name: file.name, isLoading: true }]);
    setIsParsingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

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

      // Update the badge with the parsed text content once finished
      setAttachedFiles(prev => 
        prev.map(f => f.name === file.name ? { name: file.name, text: result.text, isLoading: false } : f)
      );
    } catch (err: any) {
      console.error(err);
      alert(`Error reading file: ${err.message || 'Unknown error'}`);
      // Remove file badge on failure
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
    if (!text && attachedFiles.length === 0) return;

    const userMsg: Message = { 
      role: 'user', 
      content: text || `Analyzed file: ${attachedFiles.map(f => f.name).join(', ')}`,
      attachments: attachedFiles.map(f => f.name)
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Gather current context to send to server
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
            // For the last message, append the text content of the attached files so the LLM has it
            if (idx === updatedMessages.length - 1 && attachedFiles.length > 0) {
              const fileContentBlock = attachedFiles.map(f => 
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
          autoExecute
        })
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to reach AI Copilot server.');
      }

      const { taskId } = result;

      // Poll task status — updating currentStep live — until streaming begins or approval needed
      const finalResult = await new Promise<any>((resolve, reject) => {
        const checkStatus = async () => {
          try {
            const { data: { session: s } } = await supabase.auth.getSession();
            const t = s?.access_token;
            const statusRes = await fetch(`/api/ai/task-status/${taskId}`, {
              headers: t ? { Authorization: `Bearer ${t}` } : {}
            });
            if (!statusRes.ok) {
              throw new Error('Failed to fetch task status');
            }
            const task = await statusRes.json();

            // Surface step indicator
            if (task.currentStep) {
              setCurrentStep(task.currentStep);
              setShowStepDetails(false);
            }

            if (task.status === 'streaming' || task.status === 'completed') {
              setCurrentStep(null);
              resolve(task.result);
            } else if (task.status === 'pending_approval') {
              setCurrentStep(null);
              resolve({
                responseText: task.result.responseText,
                action: task.result.action,
                pendingApproval: true
              });
            } else if (task.status === 'failed') {
              setCurrentStep(null);
              reject(new Error(task.error || 'Copilot query failed on server'));
            } else {
              setTimeout(checkStatus, 800);
            }
          } catch (e) {
            reject(e);
          }
        };
        checkStatus();
      });

      // For pending approval cases, just append the message immediately
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

      // Append the final response with isStreaming: true to kick off frontend typewriter animation
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant' as const, 
          content: finalResult.responseText || 'Sorry, I couldn\'t formulate an answer.',
          isStreaming: true
        }
      ]);

      await fetchData();

    } catch (err: any) {
      console.error(err);
      setCurrentStep(null);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${err.message || 'Failed to contact AI Copilot. Please make sure process.env.GEMINI_API_KEY is configured correctly.'}` }
      ]);
    } finally {
      setIsLoading(false);
      setCurrentStep(null);
    }
  };

  const handleClear = () => {
    const clearedState: Message[] = [
      {
        role: 'assistant',
        content: "Cleared chat session history. How can I assist you with candidate sourcing or templates now?"
      }
    ];
    setMessages(clearedState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hirely_copilot_messages', JSON.stringify(clearedState));
    }
  };

  const translateToolToHuman = (toolName: string): string => {
    const map: Record<string, string> = {
      search_candidates: '🔍 Searching candidate profiles...',
      get_candidate_resume: '📄 Analyzing candidate resume...',
      list_active_jobs: '💼 Reviewing open vacancies...',
      list_companies: '🏢 Loading company directory...',
      get_workspace_tasks: '📅 Retrieving schedule & task lists...',
      get_pipeline_summary: '📊 Calculating pipeline statistics...',
      get_custom_field_definitions: '⚙️ Fetching custom field definitions...',
    };
    return map[toolName] || `🔧 Running ${toolName.replace(/_/g, ' ')}...`;
  };

  const handleApproveAction = async (taskId: string, messageIndex: number) => {
    setApprovingTaskId(taskId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/ai/copilot/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ taskId })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to approve task.');
      }

      // Update message state status to approved
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
    <div className="flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-136px)] space-y-3 md:space-y-4 animate-fade-in" id="copilot-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight font-sans flex items-center gap-1.5">
            <Sparkles className="h-5.5 w-5.5 md:h-6 md:w-6 text-blue-600 animate-pulse" />
            AI Copilot
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Chat directly with the ATS database. Search, summarize, and outline outreach drafts instantly.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Auto-Execute toggle switch */}
          <label className="flex items-center justify-between sm:justify-start gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-xs font-medium text-slate-700 hover:bg-slate-100/70 transition-colors">
            <span>Auto-Execute Actions</span>
            <input 
              type="checkbox" 
              checked={autoExecute}
              onChange={(e) => {
                setAutoExecute(e.target.checked);
                localStorage.setItem('hirely_copilot_auto_execute', String(e.target.checked));
              }}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          <button 
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Main Panel layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Chat area */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm h-full">
          
          {/* Scrollable chat log */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-5 bg-slate-50/30">
            {messages.map((m, idx) => {
              const isAi = m.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 md:gap-4 max-w-3xl ${isAi ? '' : 'flex-row-reverse ml-auto'}`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isAi ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-950 text-slate-200'
                  }`}>
                    {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div className={`p-3.5 md:p-4 rounded-xl text-xs leading-relaxed border ${
                    isAi 
                      ? 'bg-white text-slate-800 border-slate-100 shadow-xs' 
                      : 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  }`}>
                    <div className="space-y-2">
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
                              <strong className={isAi ? 'text-slate-950 font-semibold' : 'text-emerald-350 font-semibold'}>
                                {children}
                              </strong>
                            ),
                            ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                            li: ({ children }) => <li className="pl-0.5">{children}</li>,
                            // High-fidelity custom table styling components for a premium look
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3 border border-slate-200/80 rounded-lg shadow-3xs max-w-full">
                                <table className="min-w-full divide-y divide-slate-200 text-[10px] sm:text-[11px] bg-white">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-slate-50/80 font-bold text-slate-700">{children}</thead>,
                            th: ({ children }) => (
                              <th className="px-3 py-2 border-b border-slate-250 font-semibold text-slate-700 text-left whitespace-nowrap bg-slate-50">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3 py-2 text-slate-600 border-b border-slate-100 whitespace-nowrap align-middle max-w-[200px] truncate">
                                {children}
                              </td>
                            ),
                            tr: ({ children }) => (
                              <tr className="hover:bg-slate-50/40 transition-colors last:border-b-0">
                                {children}
                              </tr>
                            )
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* Interactive Approval Card */}
                    {isAi && m.pendingAction && (
                      <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50 max-w-md shadow-2xs font-sans text-slate-800">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-600 mb-2.5">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          <span>Pending Action Confirmation</span>
                        </div>
                        
                        <div className="bg-white border border-slate-100 rounded-lg p-3 text-xs space-y-1.5 shadow-3xs mb-3.5">
                          <div>
                            <span className="font-semibold text-slate-400">Action:</span>{' '}
                            <span className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {m.pendingAction.command.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          {m.pendingAction.data && typeof m.pendingAction.data === 'object' && (
                            <div className="border-t border-slate-100 pt-2 mt-2 space-y-1 text-[11px]">
                              {Object.entries(m.pendingAction.data).map(([key, val]) => (
                                <div key={key} className="flex justify-between gap-4">
                                  <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                                  <span className="text-slate-800 font-medium truncate max-w-[200px]">
                                    {Array.isArray(val) ? val.join(', ') : String(val || '')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {m.pendingAction.status === 'pending' ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleRejectAction(idx)}
                              disabled={approvingTaskId !== null}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            >
                              Discard
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveAction(m.pendingAction!.taskId, idx)}
                              disabled={approvingTaskId !== null}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-750 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-40"
                            >
                              {approvingTaskId === m.pendingAction.taskId ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Executing...
                                </>
                              ) : (
                                'Approve & Save'
                              )}
                            </button>
                          </div>
                        ) : m.pendingAction.status === 'approved' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50/70 border border-emerald-100/50 px-2.5 py-1.5 rounded-lg">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Executed Successfully</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200/50 px-2.5 py-1.5 rounded-lg">
                            <span>Cancelled / Discarded</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual display of attachments in user message */}
                    {!isAi && m.attachments && m.attachments.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-2">
                        {m.attachments.map((fileName, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-350 rounded-lg text-[10px] font-semibold border border-slate-700">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="max-w-[120px] truncate text-slate-300">{fileName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3 md:gap-4 max-w-3xl">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3.5 md:p-4 rounded-xl text-xs border bg-white text-slate-800 border-slate-100 shadow-xs space-y-2 min-w-[200px]">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                    <span>Thinking...</span>
                  </div>

                  {currentStep && (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                          {translateToolToHuman(currentStep.name)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowStepDetails(v => !v)}
                          className="p-0.5 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                          aria-label="Toggle details"
                        >
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${showStepDetails ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                      {showStepDetails && currentStep.args && Object.keys(currentStep.args).length > 0 && (
                        <div className="border-t border-slate-100 px-2.5 py-2 font-mono text-[10px] text-slate-400 space-y-0.5 bg-slate-50/80">
                          {Object.entries(currentStep.args).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-slate-500 font-semibold shrink-0">{key}:</span>
                              <span className="truncate max-w-[200px]">{String(val ?? '')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <div className="p-3 md:p-4 border-t border-slate-100 bg-white shrink-0">
            {/* Attached files list */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 shrink-0">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200">
                    {file.isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFile(idx)}
                      className="p-0.5 hover:bg-slate-300 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Horizontal scrollable suggestions on mobile/tablet */}
            <div className="flex lg:hidden overflow-x-auto pb-2 mb-2 gap-2 scrollbar-none shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(sug)}
                  disabled={isLoading || isParsingFile}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/60 rounded-full text-[10px] font-semibold text-slate-600 transition-all shrink-0 cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  {sug}
                </button>
              ))}
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex items-center gap-2 border border-slate-200 focus-within:border-blue-500 rounded-xl p-1.5 bg-slate-50/50 transition-colors"
            >
              {/* File Input Trigger */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.csv,.pdf"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isParsingFile}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                title="Attach text, CSV, or PDF file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <input
                type="text"
                placeholder="Ask anything about candidates, skills, active jobs, or tasks..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || isParsingFile}
                className="flex-1 text-xs px-3 py-2 bg-transparent border-none focus:outline-none text-slate-800"
              />
              <button
                type="submit"
                disabled={isLoading || isParsingFile || (!input.trim() && attachedFiles.length === 0)}
                className="h-8 px-3 md:px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Send className="h-3 w-3" />
                <span className="hidden sm:inline">Ask Copilot</span>
              </button>
            </form>
          </div>

        </div>

        {/* Info & Suggestions Column - hidden on mobile, block on lg screens */}
        <div className="hidden lg:block lg:col-span-1 space-y-4 h-full overflow-y-auto">
          
          {/* Suggestions card panel */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Sourcing Suggestions
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">Click any query template below to instantly load it into the copilot chat.</p>

            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug)}
                  disabled={isLoading}
                  className="w-full p-2.5 bg-white border border-slate-200/60 hover:border-blue-500 hover:bg-blue-50/10 text-left text-xs font-medium text-slate-700 rounded-lg transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{sug}</span>
                  <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-blue-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Prompting Guide */}
          <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-5 text-xs text-blue-900 leading-relaxed">
            <h4 className="font-semibold flex items-center gap-1 text-blue-950">
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              Recruiter prompt tip
            </h4>
            <p className="mt-2 text-slate-600">
              Because Copilot has direct connection to your corporate partners and candidate files, you can execute complex queries like:
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-blue-800 font-bold bg-white/70 p-1.5 border border-blue-200/30 rounded">
              "Check Airbnb opening and list candidates that have at least 5 years experience matching their required skills."
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
