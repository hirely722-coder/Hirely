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

  // Disconnect confirm modal
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

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
        setGmail(data.providers?.gmail || { isConnected: false });
        setLogs(data.logs || []);
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
      const res = await fetch(`${backendUrl}/api/email-integration/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ provider: 'gmail', testEmail: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Test failed');
      showToast(`✓ Test email sent to ${testEmail}!`, 'success');
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
                    onClick={() => { setTestModalOpen(true); setTestEmail(''); }}
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
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span>Only <strong>gmail.send</strong> scope is requested. We never read your inbox. Disconnect at any time.</span>
            </div>
          )}
        </div>
      )}

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
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Via connected Gmail · {gmail.email}</p>
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
                A verification email will be dispatched via your connected Gmail account to confirm the integration is working correctly.
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
