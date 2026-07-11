import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';
import { useApp } from '@/context/AdminAppContext';
import { Mail, Lock, Shield, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const router = useRouter();
  const { user, showToast, isSuperAdmin } = useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already a super admin, redirect to admin panel
  useEffect(() => {
    if (user && isSuperAdmin) {
      router.replace('/');
    }
  }, [user, isSuperAdmin]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Call server-side login endpoint to verify super admin rights
      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/^\uFEFF/, '');
      if (!backendUrl) {
        throw new Error('Missing NEXT_PUBLIC_BACKEND_URL environment variable.');
      }

      const response = await fetch(`${backendUrl}/api/superadmin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Authentication failed.');
        setIsLoading(false);
        return;
      }

      const { session } = await response.json();
      if (!session) {
        setError('Login failed. Session payload not found.');
        setIsLoading(false);
        return;
      }

      // 2. Set session on client-side Supabase instance
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (sessionErr) {
        setError(sessionErr.message);
        setIsLoading(false);
        return;
      }

      // 3. Clear cache and trigger redirect
      localStorage.removeItem('hirely_cache_is_super_admin');
      showToast('✓ Super Admin authenticated successfully! Entering Terminal.', 'success');
      router.replace('/');

    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-800 font-sans selection:bg-blue-500/10 bg-slate-50 w-full">
      {/* Background Grid & Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,#000_30%,transparent_100%)] opacity-30" />
        <div className="animate-blob absolute -top-32 -left-24 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="animate-blob animation-delay-2000 absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-white/80 border border-slate-200/80 p-8 rounded-3xl shadow-xl backdrop-blur-xl z-10 animate-fade-in relative">
        
        {/* Back Link */}
        <Link 
          href="/login"
          className="absolute left-6 top-6 flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider transition-all"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Agency Login</span>
        </Link>

        {/* Branding Header */}
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 mb-4 tracking-wide uppercase">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span>Platform Terminal</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.svg" alt="Hirly Logo" className="h-9 w-9 rounded-xl shadow-md" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Hirly <span className="text-blue-600">Admin</span>
            </h1>
          </div>
          
          <p className="text-slate-500 text-xs mt-2 font-medium">
            Sign in with owner credentials to manage SaaS operations.
          </p>
        </div>

        {/* Error Alert Panel */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 animate-shake">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-rose-800 leading-normal">{error}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleAdminAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="admin@hirely.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-11 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-2xl text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/10"
          >
            {isLoading ? 'Authenticating Admin...' : 'Enter Console'}
          </button>
        </form>

      </div>
    </div>
  );
}
