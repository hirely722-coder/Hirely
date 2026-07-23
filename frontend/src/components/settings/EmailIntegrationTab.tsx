/**
 * EmailIntegrationTab.tsx
 * Gmail-only OAuth 2.0 integration settings tab.
 * Uses AnimatedModal + the same design language as CandidateDetailsModal / EmailComposeModal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Mail, Send, CheckCircle2, AlertTriangle, RefreshCw,
  Trash2, Loader2, ShieldCheck, HelpCircle, LogIn, Check, XCircle,
  Clock
} from 'lucide-react';
import AnimatedModal from '../AnimatedModal';
import { supabase } from '../../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GmailDetails {
  isConnected: boolean;
  email?: string;
  displayName?: string;
  connectedBy?: string;
  connectedDate?: string;
  defaultSender?: string;
  status?: 'Connected' | 'Warning' | 'Error' | 'Needs Reconnect';
  lastUsedAt?: string;
}

interface AuditLog {
  id: string;
  action: string;
  userEmail?: string;
  ipAddress?: string;
  status: 'Success' | 'Failure';
  details?: string;
  createdAt: string;
}

interface EmailIntegrationTabProps {
  showToast: (text: string, type: 'success' | 'error') => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailIntegrationTab({ showToast }: EmailIntegrationTabProps) {
  const [gmail, setGmail] = useState<GmailDetails>({ isConnected: false });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Custom SMTP state
  const [smtpHost, setSmtpHost] = useState(localStorage.getItem('hirely_smtp_host') || '');
  const [smtpPort, setSmtpPort] = useState(localStorage.getItem('hirely_smtp_port') || '587');
  const [smtpUsername, setSmtpUsername] = useState(localStorage.getItem('hirely_smtp_username') || '');
  const [smtpPassword, setSmtpPassword] = useState(localStorage.getItem('hirely_smtp_password') || '');
  const [smtpEncryption, setSmtpEncryption] = useState(localStorage.getItem('hirely_smtp_encryption') || 'TLS');
  const [smtpSenderName, setSmtpSenderName] = useState(localStorage.getItem('hirely_smtp_sender_name') || '');
  const [isSmtpSaved, setIsSmtpSaved] = useState(Boolean(localStorage.getItem('hirely_smtp_host')));
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // Custom IMAP state
  const [imapHost, setImapHost] = useState(localStorage.getItem('hirely_imap_host') || 'imap.gmail.com');
  const [imapPort, setImapPort] = useState(localStorage.getItem('hirely_imap_port') || '993');
  const [imapUsername, setImapUsername] = useState(localStorage.getItem('hirely_imap_username') || '');
  const [imapPassword, setImapPassword] = useState(localStorage.getItem('hirely_imap_password') || '');
  const [imapEncryption, setImapEncryption] = useState(localStorage.getItem('hirely_imap_encryption') || 'SSL');
  const [isImapSaved, setIsImapSaved] = useState(Boolean(localStorage.getItem('hirely_imap_host')));
  const [isSavingImap, setIsSavingImap] = useState(false);
  const [isTestingImap, setIsTestingImap] = useState(false);

  // Connect wizard modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<'permissions' | 'exchanging' | 'success'>('permissions');
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string>('');
  const [isMockSuccess, setIsMockSuccess] = useState(false);

  // Test email modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testType, setTestType] = useState<'gmail' | 'smtp'>('gmail');

  // Disconnect confirm modal
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // Time Horizon Window & Sync Limit State
  const [syncHorizonWindow, setSyncHorizonWindow] = useState<string>('1w');
  const [syncLimit, setSyncLimit] = useState<number>(25);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHorizon = localStorage.getItem('hirely_email_horizon_window') || '1w';
      const savedLimit = parseInt(localStorage.getItem('hirely_email_sync_limit') || '25', 10);
      setSyncHorizonWindow(savedHorizon);
      setSyncLimit(savedLimit);
    }
  }, []);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';

  // ── Auth ─────────────────────────────────────────────────────────────────────

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  }, []);

  // ── Fetch status ─────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${backendUrl}/api/email-integration`, { headers });
      if (res.ok) {
        const data = await res.json();
        const gmailData = data.providers?.gmail || { isConnected: false };
        setGmail(gmailData);
        setLogs(data.logs || []);
        if (gmailData.isConnected) {
          localStorage.setItem('hirely_oauth_active', 'true');
        } else {
          localStorage.removeItem('hirely_oauth_active');
        }
      }

      // Fetch persisted SMTP & IMAP configurations directly from Supabase DB via /api/email-config
      const configRes = await fetch(`${backendUrl}/api/email-config`, { headers });
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.smtpHost || configData.username || configData.host) {
          setSmtpHost(configData.smtpHost || configData.host || '');
          setSmtpPort(String(configData.port || configData.smtpPort || '587'));
          setSmtpUsername(configData.username || '');
          setSmtpPassword(configData.password || '');
          setSmtpEncryption(configData.encryption || 'TLS');
          setSmtpSenderName(configData.senderName || '');
          setIsSmtpSaved(true);

          if (configData.imapHost) {
            setImapHost(configData.imapHost);
            setImapPort(String(configData.imapPort || '993'));
            setImapEncryption(configData.imapEncryption || 'SSL');
            setImapUsername(configData.username || '');
            setImapPassword(configData.password || '');
            setIsImapSaved(true);
          }
        }
      }
    } catch (err) {
      console.error('[EmailIntegrationTab] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, getHeaders]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── OAuth postMessage listener ────────────────────────────────────────────────

  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'oauth-callback') return;

      const { code, state, error, mock } = event.data;

      if (error) {
        setWizardError(error || 'Authentication cancelled or failed.');
        setWizardStep('permissions');
        return;
      }

      const storedState = sessionStorage.getItem('oauth_state');
      if (state !== storedState) {
        setWizardError('Security check failed. Please try again.');
        setWizardStep('permissions');
        return;
      }

      setWizardStep('exchanging');

      try {
        const headers = await getHeaders();
        const codeVerifier = sessionStorage.getItem('oauth_verifier') || '';
        const callbackRes = await fetch(`${backendUrl}/api/email-integration/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ provider: 'gmail', code, codeVerifier, isMockFlow: mock === 'true' }),
        });
        if (!callbackRes.ok) {
          const errData = await callbackRes.json();
          throw new Error(errData.error || 'Failed to complete connection');
        }
        const resData = await callbackRes.json();
        setSuccessEmail(resData.email || '');
        setIsMockSuccess(!!resData.isMock);
        localStorage.setItem('hirely_oauth_active', 'true');
        setWizardStep('success');
        showToast('✓ Gmail connected successfully!', 'success');
        fetchStatus();
      } catch (err: any) {
        setWizardError(err.message || 'Token exchange failed. Please try again.');
        setWizardStep('permissions');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [backendUrl, getHeaders, fetchStatus, showToast]);

  // ── Launch OAuth ──────────────────────────────────────────────────────────────

  const launchOAuth = async () => {
    setWizardError(null);
    setActionLoading('oauth');
    try {
      const headers = await getHeaders();
      const res = await fetch(`${backendUrl}/api/email-integration/auth-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ provider: 'gmail' }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Could not generate auth URL');
      }
      const { authUrl, state, codeVerifier, isMock } = await res.json();
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_verifier', codeVerifier || '');

      const target = isMock
        ? new URL(authUrl, window.location.origin).toString()
        : authUrl;

      const w = 600, h = 660;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(target, 'gmail_oauth', `width=${w},height=${h},left=${left},top=${top}`);
      if (!popup) throw new Error('Popup blocked. Please allow popups for this site and try again.');
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    setDisconnectLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${backendUrl}/api/email-integration/gmail`, { method: 'DELETE', headers });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Disconnect failed'); }
      localStorage.removeItem('hirely_oauth_active');
      showToast('✓ Gmail disconnected', 'success');
      setDisconnectModalOpen(false);
      fetchStatus();
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setDisconnectLoading(false);
    }
  };

  // ── Test Email ────────────────────────────────────────────────────────────────

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setTestLoading(true);
    try {
      const headers = await getHeaders();
      let res;
      if (testType === 'gmail') {
        res = await fetch(`${backendUrl}/api/email-integration/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ provider: 'gmail', testEmail: testEmail.trim() }),
        });
      } else {
        res = await fetch(`${backendUrl}/api/email-config/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            provider: 'SMTP',
            smtpHost,
            port: smtpPort,
            username: smtpUsername,
            password: smtpPassword,
            encryption: smtpEncryption,
            testEmailTarget: testEmail.trim()
          }),
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Test failed');
      showToast(`✓ Test email sent successfully to ${testEmail}!`, 'success');
      setTestModalOpen(false);
      setTestEmail('');
      fetchStatus();
    } catch (err: any) {
      showToast(`❌ Test failed: ${err.message}`, 'error');
    } finally {
      setTestLoading(false);
    }
  };

  // ── Open wizard (reset state) ─────────────────────────────────────────────────

  const openWizard = () => {
    setWizardError(null);
    setWizardStep('permissions');
    setSuccessEmail('');
    setIsMockSuccess(false);
    setWizardOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Section Header */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Email Integration</h3>
        <p className="text-[11px] text-slate-400 mt-1 font-medium leading-relaxed">
          Connect your Gmail account using secure OAuth 2.0. Emails are sent directly from your inbox — no passwords or SMTP configuration needed.
        </p>
      </div>

      {/* ── Gmail Card ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
      ) : (
        <div className={`rounded-2xl border p-5 transition-all ${
          gmail.isConnected ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-start justify-between gap-4">
            {/* Left: Logo + Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src="/gmail-logo.png"
                alt="Gmail"
                className="h-10 w-10 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">Gmail</p>
                  {gmail.isConnected && (
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      gmail.status === 'Needs Reconnect'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        gmail.status === 'Needs Reconnect' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`} />
                      {gmail.status || 'Connected'}
                    </span>
                  )}
                </div>

                {gmail.isConnected ? (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[11px] text-slate-600 font-mono truncate max-w-[220px]">{gmail.email}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Connected {fmtDate(gmail.connectedDate)}
                      </span>
                      {gmail.lastUsedAt && (
                        <span>· Last used {fmtDate(gmail.lastUsedAt)}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5">Not connected</p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {gmail.isConnected ? (
                <>
                  <button
                    onClick={() => { setTestType('gmail'); setTestModalOpen(true); setTestEmail(''); }}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer border border-slate-200"
                  >
                    <Send className="h-3 w-3" />
                    Test
                  </button>
                  <button
                    onClick={openWizard}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-all cursor-pointer border border-amber-200"
                  >
                    <RefreshCw className={`h-3 w-3 ${actionLoading === 'oauth' ? 'animate-spin' : ''}`} />
                    Reconnect
                  </button>
                  <button
                    onClick={() => setDisconnectModalOpen(true)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all cursor-pointer border border-red-200"
                  >
                    <Trash2 className="h-3 w-3" />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={openWizard}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Connect Gmail
                </button>
              )}
            </div>
          </div>

          {/* Security note */}
          {!gmail.isConnected && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-[10px] text-slate-500 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Uses Google OAuth 2.0 PKCE. Your password is never stored or transmitted.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Custom SMTP Configuration Card (worker-mailer via Cloudflare Sockets) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">Custom Agency SMTP Server</h4>
                <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[9px] rounded font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-purple-600" /> SECURE DIRECT
                </span>
                {isSmtpSaved && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Connect Hostinger, GoDaddy, Google Workspace, Microsoft 365, or your private agency mail server directly to send emails from your custom agency domain.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">SMTP Host</label>
            <input 
              type="text" 
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="e.g. smtp.agency.com"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">SMTP Port</label>
            <input 
              type="text" 
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587 or 465"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">Encryption Protocol</label>
            <select 
              value={smtpEncryption}
              onChange={(e) => setSmtpEncryption(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            >
              <option value="TLS">TLS / STARTTLS (Port 587)</option>
              <option value="SSL">SSL Direct (Port 465)</option>
              <option value="None">Unencrypted (Port 25)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">SMTP Username / Email</label>
            <input 
              type="text" 
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              placeholder="recruiter@agency.com"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">SMTP Password / App Key</label>
            <input 
              type="password" 
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">Sender Display Name</label>
            <input 
              type="text" 
              value={smtpSenderName}
              onChange={(e) => setSmtpSenderName(e.target.value)}
              placeholder="Apex Recruitment Team"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Secured with bank-grade 256-bit encryption.
          </div>
          <div className="flex items-center gap-2">
            {isSmtpSaved && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('hirely_smtp_host');
                  localStorage.removeItem('hirely_smtp_port');
                  localStorage.removeItem('hirely_smtp_username');
                  localStorage.removeItem('hirely_smtp_password');
                  localStorage.removeItem('hirely_smtp_encryption');
                  localStorage.removeItem('hirely_smtp_sender_name');
                  setSmtpHost('');
                  setSmtpPort('587');
                  setSmtpUsername('');
                  setSmtpPassword('');
                  setIsSmtpSaved(false);
                  showToast('✓ Custom SMTP configuration removed.', 'success');
                }}
                className="px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                Clear Settings
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!smtpHost || !smtpUsername) {
                  showToast('Please specify SMTP host and username before testing', 'error');
                  return;
                }
                setTestType('smtp');
                setTestModalOpen(true);
                setTestEmail('');
              }}
              className="px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Send className="h-3.5 w-3.5 text-slate-500" />
              Test Connection
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!smtpHost || !smtpUsername) {
                  showToast('Please specify SMTP host and username', 'error');
                  return;
                }
                setIsSavingSmtp(true);
                try {
                  const headers = await getHeaders();
                  const res = await fetch(`${backendUrl}/api/email-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify({
                      provider: 'Custom',
                      smtpHost,
                      port: smtpPort,
                      username: smtpUsername,
                      password: smtpPassword,
                      encryption: smtpEncryption,
                      senderName: smtpSenderName,
                      imapHost,
                      imapPort,
                      imapEncryption,
                      isConnected: true
                    })
                  });

                  if (res.ok) {
                    setIsSmtpSaved(true);
                    showToast('✓ Custom SMTP configuration saved to database successfully!', 'success');
                  } else {
                    const errText = await res.text();
                    showToast(`❌ Failed to save SMTP config: ${errText}`, 'error');
                  }
                } catch (err: any) {
                  showToast(`❌ Failed to save SMTP config: ${err.message}`, 'error');
                } finally {
                  setIsSavingSmtp(false);
                }
              }}
              disabled={isSavingSmtp}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {isSavingSmtp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save SMTP Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── Custom IMAP Configuration Card (Edge Sockets via cloudflare:sockets) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Mail className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">Inbound Agency IMAP Server (Live Inbox Sync)</h4>
                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] rounded font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-indigo-600" /> EDGE SOCKET READY
                </span>
                {isImapSaved && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] rounded-full font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Connect your IMAP mail server (Hostinger, cPanel, Gmail App Password, Microsoft 365) to fetch incoming candidate emails and resume attachments.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">IMAP Host</label>
            <input 
              type="text" 
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              placeholder="e.g. imap.agency.com"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">IMAP Port</label>
            <input 
              type="text" 
              value={imapPort}
              onChange={(e) => setImapPort(e.target.value)}
              placeholder="993"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">Encryption Protocol</label>
            <select 
              value={imapEncryption}
              onChange={(e) => setImapEncryption(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            >
              <option value="SSL">SSL Direct (Port 993)</option>
              <option value="TLS">TLS / STARTTLS (Port 143)</option>
              <option value="None">Unencrypted (Port 143)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">IMAP Username / Email</label>
            <input 
              type="text" 
              value={imapUsername || smtpUsername}
              onChange={(e) => setImapUsername(e.target.value)}
              placeholder="recruiter@agency.com"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">IMAP Password / App Key</label>
            <input 
              type="password" 
              value={imapPassword || smtpPassword}
              onChange={(e) => setImapPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3 text-indigo-600" /> Edge-socket stream parsing over SSL (port 993).
          </div>
          <div className="flex items-center gap-2">
            {isImapSaved && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('hirely_imap_host');
                  localStorage.removeItem('hirely_imap_port');
                  localStorage.removeItem('hirely_imap_username');
                  localStorage.removeItem('hirely_imap_password');
                  localStorage.removeItem('hirely_imap_encryption');
                  setImapHost('');
                  setImapPort('993');
                  setImapUsername('');
                  setImapPassword('');
                  setIsImapSaved(false);
                  showToast('✓ IMAP configuration cleared.', 'success');
                }}
                className="px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-bold text-xs transition-colors cursor-pointer"
              >
                Clear Settings
              </button>
            )}
            <button
              type="button"
              disabled={isTestingImap}
              onClick={async () => {
                const targetHost = imapHost || 'imap.gmail.com';
                const targetUser = imapUsername || smtpUsername;
                const targetPass = imapPassword || smtpPassword;
                if (!targetHost || !targetUser) {
                  showToast('Please specify IMAP host and username before testing', 'error');
                  return;
                }
                setIsTestingImap(true);
                try {
                  const headers = await getHeaders();
                  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
                  const res = await fetch(`${backendUrl}/api/email-config/test-imap`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify({ imapHost: targetHost, port: imapPort, username: targetUser, password: targetPass })
                  });
                  const data = await res.json();
                  if (data.success) {
                    showToast(`✓ ${data.message || 'IMAP Connection Test Passed!'}`, 'success');
                  } else {
                    showToast(`❌ IMAP Test Failed: ${data.error || data.message || 'Check credentials'}`, 'error');
                  }
                } catch (err: any) {
                  showToast(`❌ IMAP Test Error: ${err.message}`, 'error');
                } finally {
                  setIsTestingImap(false);
                }
              }}
              className="px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              {isTestingImap ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" /> : <RefreshCw className="h-3.5 w-3.5 text-slate-500" />}
              Test IMAP Connection
            </button>
            <button
              type="button"
              disabled={isSavingImap}
              onClick={async () => {
                const targetUser = imapUsername || smtpUsername;
                const targetPass = imapPassword || smtpPassword;
                if (!imapHost || !targetUser) {
                  showToast('Please specify IMAP host and username', 'error');
                  return;
                }
                setIsSavingImap(true);
                try {
                  const headers = await getHeaders();
                  const res = await fetch(`${backendUrl}/api/email-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify({
                      provider: 'Custom',
                      smtpHost,
                      port: smtpPort,
                      username: targetUser,
                      password: targetPass,
                      encryption: smtpEncryption,
                      senderName: smtpSenderName,
                      imapHost,
                      imapPort,
                      imapEncryption,
                      isConnected: true
                    })
                  });

                  if (res.ok) {
                    setIsImapSaved(true);
                    showToast('✓ IMAP configuration saved to database successfully! Ready for Email Center sync.', 'success');
                  } else {
                    const errText = await res.text();
                    showToast(`❌ Failed to save IMAP config: ${errText}`, 'error');
                  }
                } catch (err: any) {
                  showToast(`❌ Failed to save IMAP config: ${err.message}`, 'error');
                } finally {
                  setIsSavingImap(false);
                }
              }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {isSavingImap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save IMAP Settings
            </button>
          </div>
        </div>
      </div>



      {/* ── Audit Log ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-mono">Activity Log</h4>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            No activity yet. Connect your Gmail account to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Action', 'Status', 'Details', 'Time'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-500 font-bold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log, idx) => (
                  <tr key={log.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{log.action}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold ${
                        log.status === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {log.status === 'Success'
                          ? <Check className="h-2.5 w-2.5" />
                          : <XCircle className="h-2.5 w-2.5" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate" title={log.details}>{log.details || '—'}</td>
                    <td className="px-3 py-2 text-slate-400 font-mono whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CONNECT WIZARD MODAL                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatedModal isOpen={wizardOpen} onClose={() => setWizardOpen(false)}>
        {(animate) => (
          <div
            className={`bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/gmail-logo.png" alt="Gmail" className="h-8 w-8 object-contain" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {wizardStep === 'success' ? 'Gmail Connected!' : 'Connect Gmail Account'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">OAuth 2.0 · Secure · No password stored</p>
                </div>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Permissions step */}
              {(wizardStep === 'permissions') && (
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-slate-700">Hirly will request these permissions:</p>
                    {[
                      'Read your Gmail address and profile name',
                      'Send emails on your behalf (gmail.send scope only)',
                      'Offline access to silently refresh tokens',
                    ].map((perm, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-[11px] text-slate-600">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {perm}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-700 flex gap-2 leading-relaxed">
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" />
                    Your password is never shared. Only encrypted tokens are stored. You can disconnect at any time from this screen.
                  </div>

                  {wizardError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 flex gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                      {wizardError}
                    </div>
                  )}

                  <button
                    onClick={launchOAuth}
                    disabled={actionLoading === 'oauth'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20 select-none"
                  >
                    {actionLoading === 'oauth' ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening Google login...</>
                    ) : (
                      <><LogIn className="h-3.5 w-3.5" /> Continue to Google Login</>
                    )}
                  </button>
                </div>
              )}

              {/* Exchanging step */}
              {wizardStep === 'exchanging' && (
                <div className="py-10 flex flex-col items-center gap-3">
                  <Loader2 className="h-9 w-9 animate-spin text-blue-500" />
                  <p className="text-xs font-semibold text-slate-700">Completing authentication…</p>
                  <p className="text-[10px] text-slate-400">Exchanging code for access tokens</p>
                </div>
              )}

              {/* Success step */}
              {wizardStep === 'success' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="h-14 w-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">You're all set!</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Signed in as <strong className="text-slate-700">{successEmail}</strong>
                        {isMockSuccess && <span className="ml-1 text-amber-600">(mock mode)</span>}
                      </p>
                    </div>
                  </div>

                  {isMockSuccess && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-700 leading-relaxed">
                      <strong>Mock Mode:</strong> Real Google credentials aren't configured yet. Emails will be logged to the server console. Add your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to enable real sending.
                    </div>
                  )}

                  <button
                    onClick={() => setWizardOpen(false)}
                    className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer select-none"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TEST EMAIL MODAL                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatedModal isOpen={testModalOpen} onClose={() => setTestModalOpen(false)}>
        {(animate) => (
          <div
            className={`bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Send Test Email</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {testType === 'gmail' ? `Via connected Gmail · ${gmail.email}` : `Via SMTP · ${smtpUsername}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {testType === 'gmail' 
                  ? 'A verification email will be dispatched via your connected Gmail account to confirm the integration is working correctly.' 
                  : 'A verification handshake packet will be sent using your SMTP credentials to test connection logs.'
                }
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                  Recipient Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-slate-300 font-medium bg-white"
                  onKeyDown={e => e.key === 'Enter' && handleSendTest()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setTestModalOpen(false)}
                  className="flex-1 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={!testEmail.trim() || testLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl cursor-pointer transition-all select-none"
                >
                  {testLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</> : <><Send className="h-3 w-3" /> Send Test</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DISCONNECT CONFIRM MODAL                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatedModal isOpen={disconnectModalOpen} onClose={() => setDisconnectModalOpen(false)}>
        {(animate) => (
          <div
            className={`bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Disconnect Gmail</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{gmail.email}</p>
                </div>
              </div>
              <button
                onClick={() => setDisconnectModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Removing your Gmail connection will disable email sending from Hirly until you reconnect. Sent emails and activity logs are not affected.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDisconnectModalOpen(false)}
                  className="flex-1 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnectLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl cursor-pointer transition-all select-none"
                >
                  {disconnectLoading
                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Removing…</>
                    : <><Trash2 className="h-3 w-3" /> Yes, Disconnect</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

    </div>
  );
}
