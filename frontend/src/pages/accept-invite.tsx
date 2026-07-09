import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '../context/AppContext';
import { Sparkles, Building2, UserPlus, Check, X, AlertCircle, ArrowRight, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function AcceptInvite() {
  const router = useRouter();
  const { token } = router.query;
  const { user, logout, showToast, fetchData } = useApp();

  const [invitation, setInvitation] = useState<any | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!router.isReady || !token) return;

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/public/invitations/${token}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Invitation is invalid or has expired.');
        }

        setInvitation(data.invitation);
        setIsValid(true);
      } catch (err: any) {
        setError(err.message || 'Failed to verify invitation.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [router.isReady, token]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken || ''}`
        },
        body: JSON.stringify({ token })
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
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace(`/login?inviteToken=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center font-sans text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
            H
          </div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Verifying Invitation...</span>
        </div>
      </div>
    );
  }

  const isEmailMismatch = user && invitation && user.email?.toLowerCase() !== invitation.email?.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden text-white font-sans selection:bg-indigo-500/30 bg-[#07070d] w-full">
      {/* Background Grid & Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070d]">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
        <div className="animate-blob absolute -top-32 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="animate-blob animation-delay-2000 absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#07070d]/60 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-xs font-bold text-indigo-300 mb-4 tracking-wide uppercase">
            <Sparkles className="h-3 w-3" />
            <span>Team Invitation</span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight font-display mb-2">
            Join Agency Workspace
          </h1>
        </div>

        {error || !isValid ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-rose-300 leading-normal">
                {error || 'This invitation is invalid or has expired.'}
              </span>
            </div>
            <Link href="/" className="w-full flex justify-center py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white hover:bg-white/10 transition-all">
              Go to Home Page
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Invitation Card Summary */}
            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{invitation.workspaceName}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Invited role: <span className="text-indigo-300 font-bold uppercase">{invitation.role}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Department: <span className="text-indigo-300 font-bold">{invitation.department}</span>
                </p>
              </div>
            </div>

            {/* Scenarios based on session state */}
            {!user ? (
              <div className="space-y-4">
                <p className="text-center text-xs text-slate-400">
                  This invitation is for <span className="text-white font-semibold font-mono">{invitation.email}</span>. Please sign in or register to join.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Link href={`/login?inviteToken=${token}&tab=login`} className="flex justify-center py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all">
                    Sign In
                  </Link>
                  <Link href={`/login?inviteToken=${token}&tab=signup`} className="flex justify-center py-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md">
                    Create Account
                  </Link>
                </div>
              </div>
            ) : isEmailMismatch ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-semibold text-amber-300 leading-normal space-y-1">
                    <p>Account Email Mismatch</p>
                    <p>You are logged in as <span className="text-white font-mono">{user.email}</span>, but this invitation is for <span className="text-white font-mono">{invitation.email}</span>.</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  <span>Log out & Sign in with correct email</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-xs text-slate-400">
                  Logged in as <span className="text-white font-semibold font-mono">{user.email}</span>. Click below to accept the invitation and link your account.
                </p>
                <button
                  onClick={handleAcceptInvite}
                  disabled={submitting}
                  className="w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
                >
                  {submitting ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span>Accept & Join Team</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { supabase } from '../utils/supabase';
