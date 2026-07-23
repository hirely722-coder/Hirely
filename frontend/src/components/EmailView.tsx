import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Inbox, Send, FileText, Archive, AlertOctagon, Trash2, Star, Search, RefreshCw, 
  Plus, CornerUpLeft, CornerUpRight, Paperclip, Sparkles, User, Settings, ExternalLink,
  Mail, ArrowLeft, X, Briefcase, Tag, Check, ChevronRight, Clock, Calendar
} from 'lucide-react';
import { Candidate, Company, Job } from '../types';
import { EmailCenterComposeModal } from './modals/EmailCenterComposeModal';
import { ResumeProcessingQueueModal } from './modals/ResumeProcessingQueueModal';
import { Select } from './ui/Select';
import { supabase } from '../utils/supabase';
import { getCachedMessages, saveCachedMessages, getAllWorkspaceMessages, CachedMessage } from '../utils/emailStorage';

function decodeMimeHeader(headerStr: string): string {
  if (!headerStr) return '';
  try {
    return headerStr.replace(/=\?([^?]+)\?([QBqb])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
      if (encoding.toUpperCase() === 'Q') {
        return text.replace(/=([0-9A-F]{2})/gi, (__: any, hex: string) => String.fromCharCode(parseInt(hex, 16))).replace(/_/g, ' ');
      } else if (encoding.toUpperCase() === 'B') {
        try {
          return decodeURIComponent(escape(atob(text)));
        } catch (e) {
          try { return atob(text); } catch (err) { return text; }
        }
      }
      return text;
    });
  } catch (e) {
    return headerStr;
  }
}

function getRootDomain(domainStr: string): string {
  if (!domainStr) return '';
  const parts = domainStr.toLowerCase().trim().split('.');
  if (parts.length <= 2) return domainStr;
  return parts.slice(-2).join('.');
}

function SenderAvatar({ email, name, candidatePhoto }: { email: string; name: string; candidatePhoto?: string }) {
  const [imgErrorStage, setImgErrorStage] = useState(0);
  
  const rawName = name || email || 'Email';
  const cleanName = rawName.includes('<') ? rawName.replace(/<[^>]+>/, '').trim() : rawName;
  const displayName = cleanName.includes('@') ? cleanName.split('@')[0] : cleanName;
  const initials = displayName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase() || 'EM';

  const fullDomain = email.includes('@') ? email.split('@')[1] : '';
  const rootDomain = getRootDomain(fullDomain);
  const isGeneric = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes((rootDomain || '').toLowerCase());

  let avatarSrc: string | null = candidatePhoto || null;
  if (!avatarSrc && !isGeneric && fullDomain) {
    if (imgErrorStage === 0) {
      avatarSrc = `https://www.google.com/s2/favicons?domain=${rootDomain}&sz=128&default_icon=404`;
    } else if (imgErrorStage === 1 && fullDomain !== rootDomain) {
      avatarSrc = `https://www.google.com/s2/favicons?domain=${fullDomain}&sz=128&default_icon=404`;
    }
  }

  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
  ];
  const colorIndex = Math.abs((displayName || 'E').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const colorClass = colors[colorIndex];

  if (avatarSrc && imgErrorStage < 2) {
    return (
      <div className="h-9 w-9 rounded-full shrink-0 overflow-hidden bg-white border border-slate-200 p-0.5 shadow-xs flex items-center justify-center">
        <img
          src={avatarSrc}
          alt={displayName}
          className="h-full w-full object-contain rounded-full"
          onError={() => setImgErrorStage(prev => prev + 1)}
        />
      </div>
    );
  }

  return (
    <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs border font-sans shadow-xs ${colorClass}`}>
      {initials}
    </div>
  );
}

interface EmailThreadItem {
  id: string;
  subject: string;
  snippet?: string;
  folder: string;
  unreadCount: number;
  isStarred: boolean;
  isArchived: boolean;
  lastMessageAt: string;
  candidateName?: string;
  candidateEmail?: string;
  messages?: any[];
}

interface EmailViewProps {
  candidates: Candidate[];
  jobs: Job[];
  companies: Company[];
  showToast: (text: string, type: 'success' | 'error') => void;
  onNavigateToSettings?: (tab?: string) => void;
  setSelectedCandidate?: (cand: Candidate | null) => void;
}

export function EmailView({
  candidates = [],
  jobs = [],
  companies = [],
  showToast,
  onNavigateToSettings,
  setSelectedCandidate,
}: EmailViewProps) {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash' | 'starred'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [threads, setThreads] = useState<EmailThreadItem[]>([]);

  const filteredThreads = useMemo(() => {
    if (!selectedDateFilter) return threads;
    return threads.filter(t => {
      if (!t.lastMessageAt) return false;
      const msgDate = new Date(t.lastMessageAt).toISOString().split('T')[0];
      return msgDate === selectedDateFilter;
    });
  }, [threads, selectedDateFilter]);
  
  // Two-State Navigation: 'inbox' vs 'reading'
  const [viewMode, setViewMode] = useState<'inbox' | 'reading'>('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeThreadDetails, setActiveThreadDetails] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHorizonWindow, setSyncHorizonWindow] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('hirely_email_horizon_window') : '') || '1d';
  });
  const [connectedAccountEmail, setConnectedAccountEmail] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('hirely_smtp_username') : '') || 'recruiter@hirly.online';
  });
  const [unreadTotal, setUnreadTotal] = useState(0);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialRecipient, setComposeInitialRecipient] = useState('');
  const [composeInitialSubject, setComposeInitialSubject] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');
  const [isCandidateDrawerOpen, setIsCandidateDrawerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Inline Quick Reply State
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [isSendingInline, setIsSendingInline] = useState(false);

  // Preserve scroll position
  const conversationListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAccountInfo();
    fetchThreads();
  }, [activeFolder, searchQuery]);

  const fetchAccountInfo = async () => {
    try {
      const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('hirely_smtp_username') : '';
      if (savedLocal) {
        setConnectedAccountEmail(savedLocal);
      }
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/accounts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        if (data.connected && data.account?.email) {
          setConnectedAccountEmail(data.account.email);
        }
      }
    } catch (err) {
      console.warn('[EmailView] Error fetching account info:', err);
    }
  };

  const fetchThreads = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const workspaceId = session?.user?.user_metadata?.workspace_id || 'ws_default';

      // 1. Load cached messages from client-side IndexedDB for instant render
      const cached = await getAllWorkspaceMessages(workspaceId);
      const filtered = cached.filter((msg: CachedMessage) => {
        if (activeFolder === 'starred') return msg.isStarred;
        if (activeFolder === 'inbox') return msg.folder === 'inbox' || !msg.folder;
        return msg.folder === activeFolder;
      });

      const localThreads: EmailThreadItem[] = filtered.map((msg: CachedMessage) => ({
        id: msg.threadId || msg.id,
        subject: decodeMimeHeader(msg.subject),
        snippet: decodeMimeHeader(msg.snippet || msg.subject),
        folder: msg.folder || 'inbox',
        unreadCount: msg.isRead ? 0 : 1,
        isStarred: msg.isStarred,
        isArchived: false,
        lastMessageAt: msg.receivedAt,
        candidateName: decodeMimeHeader(msg.senderName || ''),
        candidateEmail: msg.senderEmail,
        messages: [msg]
      }));
      setThreads(localThreads);

      // 2. Fetch server database threads (if any) and merge seamlessly without clearing local IndexedDB threads
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/threads?folder=${activeFolder}&q=${encodeURIComponent(searchQuery)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        const serverThreads = data.threads || [];
        if (serverThreads.length > 0) {
          const merged = [...localThreads];
          for (const st of serverThreads) {
            if (!merged.some(lt => lt.id === st.id)) {
              merged.push(st);
            }
          }
          setThreads(merged);
        } else if (localThreads.length > 0) {
          setThreads(localThreads);
        }
      }
    } catch (err) {
      console.warn('[EmailView] Error fetching threads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      setSelectedThreadId(threadId);
      setViewMode('reading');

      // 1. Load thread reading details from local threads state for 0ms instant display
      const localThread = threads.find(t => t.id === threadId);
      if (localThread) {
        setActiveThreadDetails(localThread);
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t));
      }

      // 2. Query backend DB thread details if available
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/threads/${threadId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        if (data.thread) {
          setActiveThreadDetails(data.thread);
        }
      }
    } catch (err) {
      console.warn('[EmailView] Thread details fetch fallback to local:', err);
    }
  };

  const handleSyncMailbox = async () => {
    try {
      setIsSyncing(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const workspaceId = session?.user?.user_metadata?.workspace_id || 'ws_default';

      // Read active time horizon window & compute highest cached UID for Stage 2 High-Water Mark Delta Fetch
      const horizonWindow = syncHorizonWindow || '1d';

      // Compute highest cached UID for Stage 2 High-Water Mark Delta Fetch
      const cached = await getAllWorkspaceMessages(workspaceId);
      const folderCached = cached.filter(m => (m.folder || 'inbox') === activeFolder);
      let lastKnownUid: number | undefined = undefined;
      if (folderCached.length > 0) {
        const uids = folderCached.map(m => parseInt((m.id || '').replace(/[^0-9]/g, ''), 10)).filter(n => !isNaN(n));
        if (uids.length > 0) {
          lastKnownUid = Math.max(...uids);
        }
      }

      const res = await fetch(`${backendUrl}/api/email-center/stream-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          folder: activeFolder,
          horizonWindow,
          lastKnownUid
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          await saveCachedMessages(workspaceId, data.messages);
        }
        showToast(`✓ IMAP Mailbox sync complete (${data.syncedCount || 0} new emails received)`, 'success');
        fetchThreads();
      } else {
        const errText = await res.text();
        showToast(`❌ Sync failed: ${errText}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, threadId: string, currentStarred: boolean) => {
    e.stopPropagation();
    try {
      const newStarred = !currentStarred;
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, isStarred: newStarred } : t));
      
      const targetThread = threads.find(t => t.id === threadId);
      if (targetThread) {
        const { data: { session } } = await supabase.auth.getSession();
        const workspaceId = session?.user?.user_metadata?.workspace_id || 'ws_default';
        const msg = targetThread.messages?.[0] || {
          id: targetThread.id,
          threadId: targetThread.id,
          subject: targetThread.subject,
          snippet: targetThread.snippet || targetThread.subject,
          bodyText: targetThread.subject,
          bodyHtml: `<p>${targetThread.subject}</p>`,
          folder: targetThread.folder || 'inbox',
          isRead: true,
          isStarred: newStarred,
          receivedAt: targetThread.lastMessageAt || new Date().toISOString(),
          senderName: targetThread.candidateName || 'Sender',
          senderEmail: targetThread.candidateEmail || 'sender@domain.com'
        };
        msg.isStarred = newStarred;
        await saveCachedMessages(workspaceId, [msg]);
      }
    } catch (err) {}
  };

  const handleSendInlineReply = async () => {
    if (!inlineReplyText.trim() || !latestMessage) return;
    try {
      setIsSendingInline(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${backendUrl}/api/email-center/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          to: latestMessage.senderEmail,
          subject: activeThreadDetails?.subject?.startsWith('Re:') ? activeThreadDetails.subject : `Re: ${activeThreadDetails?.subject}`,
          bodyHtml: `<p>${inlineReplyText.replace(/\n/g, '<br/>')}</p>`,
          threadId: selectedThreadId,
        })
      });

      if (res.ok) {
        showToast('✓ Reply sent successfully!', 'success');
        setInlineReplyText('');
        if (selectedThreadId) fetchThreadDetails(selectedThreadId);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`❌ Reply failed: ${data.message || data.error || 'Failed to send'}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ Error sending reply: ${err.message}`, 'error');
    } finally {
      setIsSendingInline(false);
    }
  };

  const activeThreadMessages = activeThreadDetails?.messages || [];
  const latestMessage = activeThreadMessages[activeThreadMessages.length - 1];
  const matchedCandidate = candidates.find(c => 
    c.email?.toLowerCase() === (latestMessage?.senderEmail || activeThreadDetails?.candidateEmail || '').toLowerCase()
  );

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden font-sans">
      {/* ── Top Header Toolbar ── */}
      <div className="h-14 px-5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 shrink-0 relative">
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-md">
          {viewMode === 'reading' ? (
            <button
              type="button"
              onClick={() => setViewMode('inbox')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
              Back to Inbox
            </button>
          ) : (
            <div className="relative w-full max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates, emails, subjects..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsQueueOpen(true)}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100/80 text-purple-700 border border-purple-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Resume Queue
          </button>

          {/* Time Horizon Selector (Shadcn Select) */}
          <Select
            value={syncHorizonWindow}
            icon={<Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
            onChange={(val) => {
              setSyncHorizonWindow(val);
              if (typeof window !== 'undefined') {
                localStorage.setItem('hirely_email_horizon_window', val);
              }
              const labelMap: Record<string, string> = { '1d': 'Past 24 Hours', '1w': 'Past 7 Days', '1m': 'Past 30 Days', '1y': 'Past 1 Year', 'all': 'All Time' };
              showToast(`✓ Sync horizon set to ${labelMap[val] || val}`, 'success');
            }}
            options={[
              { value: '1d', label: 'Past 24 Hours' },
              { value: '1w', label: 'Past 7 Days' },
              { value: '1m', label: 'Past 30 Days' },
              { value: '1y', label: 'Past 1 Year' },
              { value: 'all', label: 'All Time' }
            ]}
          />

          <button
            type="button"
            onClick={handleSyncMailbox}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            {isSyncing ? 'Syncing...' : 'Sync Mailbox'}
          </button>

          <button
            type="button"
            onClick={() => {
              setComposeInitialRecipient('');
              setComposeInitialSubject('');
              setComposeInitialBody('');
              setIsComposeOpen(true);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            Compose
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigateToSettings) onNavigateToSettings('email_integration');
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Email Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main Studio Body ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Sidebar Navigation (Always Visible) */}
        <div className="w-56 border-r border-slate-200/80 bg-slate-50/40 p-3 space-y-4 flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="space-y-1">
            {[
              { key: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadTotal },
              { key: 'starred', label: 'Starred', icon: Star },
              { key: 'sent', label: 'Sent', icon: Send },
              { key: 'drafts', label: 'Drafts', icon: FileText },
              { key: 'archive', label: 'Archive', icon: Archive },
              { key: 'spam', label: 'Spam', icon: AlertOctagon },
              { key: 'trash', label: 'Trash', icon: Trash2 },
            ].map(item => {
              const IconComp = item.icon;
              const isActive = activeFolder === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveFolder(item.key as any);
                    setViewMode('inbox');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 font-bold' 
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Connected Mailbox Badge Pill */}
          <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 truncate" title={connectedAccountEmail}>
                {connectedAccountEmail}
              </p>
              <p className="text-[9px] text-slate-400 uppercase font-mono">Connected</p>
            </div>
          </div>
        </div>

        {/* ── Dynamic Content Container ── */}
        {viewMode === 'inbox' ? (
          /* MODE 1: INBOX MODE (Expanded Conversation Browser) */
          <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden" ref={conversationListRef}>
            <div className="px-6 py-2.5 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/40">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider font-mono flex items-center gap-2">
                <span>{activeFolder}</span>
                <span className="px-2 py-0.5 bg-slate-200/60 text-slate-700 text-[10px] font-bold rounded-full font-mono">
                  {filteredThreads.length} conversations
                </span>
              </span>

              {/* Shadcn-Styled Date Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 font-mono">Filter Date:</span>
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="bg-transparent text-slate-800 text-xs font-bold border-none outline-none cursor-pointer focus:ring-0 font-sans"
                  />
                </div>

                {selectedDateFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter('')}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-red-200/60"
                    title="Clear Date Filter"
                  >
                    <X className="h-3 w-3" />
                    Clear Date Filter
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <Inbox className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-800 text-sm">No conversations in {activeFolder} {selectedDateFilter ? `on ${selectedDateFilter}` : ''}</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {selectedDateFilter ? 'Try clearing the date filter or choosing a different date.' : 'Click "Sync Mailbox" to check your live IMAP inbox or compose a new candidate email.'}
                  </p>
                </div>
              ) : (
                filteredThreads.map((t: EmailThreadItem) => {
                  const isUnread = t.unreadCount > 0;
                  const senderEmail = t.candidateEmail || '';
                  const rawName = t.candidateName || senderEmail || t.subject;
                  const cleanName = rawName.includes('<') ? rawName.replace(/<[^>]+>/, '').trim() : rawName;
                  const displayName = cleanName.includes('@') ? cleanName.split('@')[0] : cleanName;

                  // Match ATS Candidate Avatar
                  const matchingCandidate = candidates?.find(c => c.email?.toLowerCase() === senderEmail.toLowerCase());
                  const candidatePhoto = (matchingCandidate as any)?.avatar_url || (matchingCandidate as any)?.avatarUrl || (matchingCandidate as any)?.photo;

                  return (
                    <div
                      key={t.id}
                      onClick={() => fetchThreadDetails(t.id)}
                      className={`px-6 py-3.5 cursor-pointer transition-all flex items-start gap-3.5 group relative border-l-2 ${
                        isUnread ? 'bg-blue-50/30 border-l-blue-600 font-semibold' : 'hover:bg-slate-50/80 border-l-transparent'
                      }`}
                    >
                      {/* Avatar / Favicon Component */}
                      <SenderAvatar
                        email={senderEmail}
                        name={cleanName}
                        candidatePhoto={candidatePhoto}
                      />

                      {/* Card Content */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 animate-pulse" />
                            )}
                            <span className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                              {displayName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                            {new Date(t.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {decodeMimeHeader(t.subject)}
                        </p>

                        <p className="text-[11px] text-slate-400 truncate leading-snug">
                          {decodeMimeHeader(t.snippet || 'No preview content available')}
                        </p>
                      </div>

                      {/* Card Actions (Star) */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(e, t.id, t.isStarred)}
                          className="text-slate-300 hover:text-amber-400 cursor-pointer transition-colors p-1 rounded-md hover:bg-slate-100"
                        >
                          <Star className={`h-4 w-4 ${t.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* MODE 2: READING MODE (Full Canvas Focused Reading & Inline Reply) */
          <div className="flex-1 flex min-h-0 bg-white overflow-hidden relative">
            {activeThreadDetails ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Reading Mode Sticky Toolbar */}
                <div className="px-8 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('inbox')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComposeInitialRecipient(latestMessage?.senderEmail || '');
                        setComposeInitialSubject(`Re: ${activeThreadDetails.subject}`);
                        setComposeInitialBody(`\n\n--- On ${new Date(latestMessage?.receivedAt).toLocaleString()}, ${latestMessage?.senderName || latestMessage?.senderEmail} wrote:\n${latestMessage?.bodyText || ''}`);
                        setIsComposeOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      Reply
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComposeInitialRecipient('');
                        setComposeInitialSubject(`Fwd: ${activeThreadDetails.subject}`);
                        setComposeInitialBody(`\n\n--- Forwarded Message ---\n${latestMessage?.bodyText || ''}`);
                        setIsComposeOpen(true);
                      }}
                      className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CornerUpRight className="h-3.5 w-3.5 text-slate-400" />
                      Forward
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCandidateDrawerOpen(!isCandidateDrawerOpen)}
                      className={`px-3 py-1.5 border text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isCandidateDrawerOpen 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Candidate Details
                    </button>
                  </div>
                </div>

                {/* Full-Canvas Scrollable Reading Area */}
                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 max-w-4xl mx-auto w-full">
                  {/* Subject Title */}
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight leading-snug">
                      {decodeMimeHeader(activeThreadDetails.subject)}
                    </h1>
                  </div>

                  {/* AI Assistant Banner */}
                  {latestMessage?.aiSummary && (
                    <div className="p-4 bg-purple-50/60 border border-purple-200/70 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-bold text-purple-900 font-sans">AI Assistant Insights</span>
                        </div>
                        {latestMessage.aiSentiment && (
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                            latestMessage.aiSentiment === 'Positive' ? 'bg-emerald-100 text-emerald-800' :
                            latestMessage.aiSentiment === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                            latestMessage.aiSentiment === 'Negative' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {latestMessage.aiSentiment} Sentiment
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-950 leading-relaxed font-sans">{latestMessage.aiSummary}</p>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-200/40">
                        {latestMessage.aiActionItems && latestMessage.aiActionItems.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-purple-800">Action Items:</span>
                            {latestMessage.aiActionItems.map((act: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-white border border-purple-200 text-purple-800 text-[10px] font-semibold rounded-md">
                                ✓ {act}
                              </span>
                            ))}
                          </div>
                        )}

                        {latestMessage.suggestedReply && (
                          <button
                            type="button"
                            onClick={() => setInlineReplyText(latestMessage.suggestedReply)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs ml-auto"
                          >
                            <Sparkles className="h-3 w-3 text-purple-200" />
                            Suggested Reply
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Messages Stream */}
                  {activeThreadMessages.map((msg: any) => {
                    const matchingCand = candidates?.find(c => c.email?.toLowerCase() === msg.senderEmail?.toLowerCase());
                    const candPhoto = (matchingCand as any)?.avatar_url || (matchingCand as any)?.avatarUrl || (matchingCand as any)?.photo;

                    return (
                      <div key={msg.id} className="space-y-4 border-b border-slate-100 pb-8 last:border-b-0">
                        {/* Sender Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SenderAvatar
                              email={msg.senderEmail || ''}
                              name={msg.senderName || msg.senderEmail || ''}
                              candidatePhoto={candPhoto}
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{decodeMimeHeader(msg.senderName || msg.senderEmail)}</p>
                              <p className="text-[11px] text-slate-400 font-mono">&lt;{msg.senderEmail}&gt;</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(msg.receivedAt).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                      {/* HTML Body */}
                      <div 
                        className="text-sm text-slate-800 leading-relaxed font-sans space-y-3 max-w-none"
                        dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.bodyText }}
                      />

                      {/* Attachments Chips */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 space-y-2">
                          <p className="text-[11px] font-bold text-slate-500 uppercase font-mono flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                            Attachments ({msg.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att: any, idx: number) => (
                              <a
                                key={idx}
                                href={att.contentUrl || '#'}
                                download={att.filename}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="truncate max-w-[200px]">{att.filename}</span>
                                <span className="text-[10px] text-slate-400 font-mono font-normal">
                                  ({Math.round((att.fileSize || att.size || 1024) / 1024)} KB)
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                  {/* Inline Quick Reply Composer */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 font-sans flex items-center gap-2">
                        <CornerUpLeft className="h-3.5 w-3.5 text-blue-600" />
                        Reply to {latestMessage?.senderName || latestMessage?.senderEmail}
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      value={inlineReplyText}
                      onChange={(e) => setInlineReplyText(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-all font-sans placeholder:text-slate-400"
                    />

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-400">Sent via your connected email ({connectedAccountEmail})</p>
                      <button
                        type="button"
                        onClick={handleSendInlineReply}
                        disabled={isSendingInline || !inlineReplyText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isSendingInline ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* On-Demand Slide-Over Candidate Details Drawer */}
            {isCandidateDrawerOpen && matchedCandidate && (
              <div className="w-80 border-l border-slate-200/80 bg-white p-5 space-y-5 overflow-y-auto shrink-0 shadow-lg absolute right-0 top-0 bottom-0 z-20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Candidate Details</span>
                  <button
                    type="button"
                    onClick={() => setIsCandidateDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base font-sans shrink-0 shadow-2xs">
                      {matchedCandidate.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{matchedCandidate.name}</h4>
                      <p className="text-xs text-slate-500">{matchedCandidate.designation || 'Candidate'}</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50/80 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-900">Pipeline Stage:</span>
                    <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                      {matchedCandidate.status}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      <span>Experience: {(matchedCandidate as any).experienceYears || matchedCandidate.experience || '3+'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span>Notice Period: {(matchedCandidate as any).noticePeriodDays || matchedCandidate.noticePeriod || '30 days'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (setSelectedCandidate) setSelectedCandidate(matchedCandidate);
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs mt-4"
                  >
                    View Candidate Profile
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rich Email Compose Modal */}
      <EmailCenterComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        candidates={candidates}
        jobs={jobs}
        companies={companies}
        initialRecipient={composeInitialRecipient}
        initialSubject={composeInitialSubject}
        initialBody={composeInitialBody}
        threadId={selectedThreadId || undefined}
        showToast={showToast}
        onSuccess={() => fetchThreads()}
      />

      {/* Resume Processing Queue Modal */}
      <ResumeProcessingQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
