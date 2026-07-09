import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '../context/AppContext';
import { Sparkles, Building2, Ticket, ArrowRight, AlertCircle, LogOut } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const { user, logout, showToast, fetchData } = useApp();
  
  const [agencyName, setAgencyName] = useState('');
  const [agencySlug, setAgencySlug] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Auto-generate slug from name
  useEffect(() => {
    if (agencyName) {
      setAgencySlug(agencyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    } else {
      setAgencySlug('');
    }
  }, [agencyName]);

  // Redirect if they already have a workspace ID
  const workspaceId = user?.workspace_id;
  useEffect(() => {
    if (user && user.workspace_id) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken || ''}`
        },
        body: JSON.stringify({
          name: agencyName,
          slug: agencySlug
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      showToast('✓ Workspace created successfully! Welcome to Hirely.');
      // Refetch user profile details
      await fetchData();
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken || ''}`
        },
        body: JSON.stringify({
          token: inviteToken.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      showToast('✓ Successfully joined the workspace!');
      await fetchData();
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to join workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden text-white font-sans selection:bg-indigo-500/30 bg-[#07070d] w-full">
      {/* Background Grid & Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070d]">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
        <div className="animate-blob absolute -top-32 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="animate-blob animation-delay-2000 absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="animate-blob animation-delay-4000 absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-[#07070d]/60 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl z-10 animate-fade-in">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-xs font-bold text-indigo-300 mb-4 tracking-wide uppercase">
            <Sparkles className="h-3 w-3" />
            <span>Workspace Setup</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl font-black text-white tracking-tight font-display">
              Welcome to Hirely AI
            </h1>
          </div>
          
          <p className="text-slate-400 text-xs mt-2 font-medium">
            To get started, please set up a workspace or join an existing agency team.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'create' 
                ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white font-semibold'
            }`}
          >
            Create Agency
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('join');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'join' 
                ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white font-semibold'
            }`}
          >
            Join Agency
          </button>
        </div>

        {/* Error Alert Panel */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-shake">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-rose-300 leading-normal">{error}</span>
          </div>
        )}

        {/* Dynamic Panel Form */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agency Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Recruiting"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workspace URL Slug</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  placeholder="auto-generated-slug"
                  value={agencySlug}
                  className="w-full bg-slate-950/50 border border-slate-800 text-slate-500 rounded-2xl px-4 py-3 text-xs focus:outline-none transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Your workspace will be initialized under the free starter plan.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !agencyName.trim()}
              className="w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinWorkspace} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invitation Token</label>
              <div className="relative">
                <Ticket className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Paste your invite token..."
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Please paste the secure token provided in your invitation link (e.g. standard UUID string).
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inviteToken.trim()}
              className="w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Join Agency Team</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Logout Actions */}
        <div className="text-center mt-8 pt-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out of account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { supabase } from '../utils/supabase';
