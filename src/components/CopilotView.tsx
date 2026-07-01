import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User, Trash2, Search, ArrowRight, HelpCircle } from 'lucide-react';
import { Candidate, Job, Company, Task, EmailTemplate } from '../types';

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
}

const SUGGESTIONS = [
  "Find Python Developers",
  "Show Candidates with 5 Years Experience",
  "Match Candidates for Senior React Developer",
  "Create Follow-up Email for Clara Oswald",
  "Summarize Marcus Vance resume notes"
];

export default function CopilotView({
  candidates,
  jobs,
  companies,
  tasks,
  templates
}: CopilotViewProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          context
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reach AI Copilot server.');
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.responseText || 'Sorry, I couldn\'t formulate an answer.' }
      ]);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${err.message || 'Failed to contact AI Copilot. Please make sure process.env.GEMINI_API_KEY is configured correctly.'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Cleared chat session history. How can I assist you with candidate sourcing or templates now?"
      }
    ]);
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
        
        <button 
          onClick={handleClear}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear Chat
        </button>
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
                    {/* Simplified markdown formatter for bolding, bullet points and spacing */}
                    <div className="space-y-2 whitespace-pre-wrap">
                      {m.content.split('\n').map((line, lIdx) => {
                        // Bold parsing **some text**
                        let content: any = line;
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          content = parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className={isAi ? 'text-slate-950' : 'text-emerald-300'}>{part}</strong> : part);
                        }
                        
                        // Bullet parsing starting with "-"
                        if (line.trim().startsWith('-')) {
                          return (
                            <div key={lIdx} className="flex items-start gap-2 pl-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{content.toString().replace(/^\s*-\s*/, '')}</span>
                            </div>
                          );
                        }

                        return <p key={lIdx}>{content}</p>;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-8 w-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <span>Copilot is searching the ATS database and formulating candidate lists...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <div className="p-3 md:p-4 border-t border-slate-100 bg-white shrink-0">
            {/* Horizontal scrollable suggestions on mobile/tablet */}
            <div className="flex lg:hidden overflow-x-auto pb-2 mb-2 gap-2 scrollbar-none shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(sug)}
                  disabled={isLoading}
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
              <input
                type="text"
                placeholder="Ask anything about candidates, skills, active jobs, or tasks..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 text-xs px-3 py-2 bg-transparent border-none focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
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
