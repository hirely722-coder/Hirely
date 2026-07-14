import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../utils/supabase';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User, Sparkles, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

function GoogleLogo({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height={size} viewBox="0 0 24 24" width={size} className="shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const { user, showToast } = useApp();
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const isSignUp = authMode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // If session already exists, redirect to dashboard (except during password reset)
  useEffect(() => {
    if (user && authMode !== 'reset') {
      router.replace('/');
    }
  }, [user, authMode]);

  // Handle recovery link events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cache signup query parameters in localStorage for onboarding step
  useEffect(() => {
    if (router.isReady && router.query.error) {
      setError(router.query.error as string);
    }
  }, [router.isReady, router.query.error]);

  useEffect(() => {
    const { plan, cycle, trial, mode } = router.query;
    if (plan) localStorage.setItem('hirely_setup_plan', plan as string);
    if (cycle) localStorage.setItem('hirely_setup_cycle', cycle as string);
    if (trial) localStorage.setItem('hirely_setup_trial', trial as string);
    if (mode === 'reset') {
      setAuthMode('reset');
    }
  }, [router.query]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (authMode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your email address');
        setIsLoading(false);
        return;
      }
      const { error: forgotErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login?mode=reset'
      });
      if (forgotErr) {
        setError(forgotErr.message);
      } else {
        showToast('Password reset link sent successfully! Check your inbox.');
        setAuthMode('signin');
      }
      setIsLoading(false);
      return;
    }

    if (authMode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }
      const { error: resetErr } = await supabase.auth.updateUser({
        password: password
      });
      if (resetErr) {
        setError(resetErr.message);
      } else {
        showToast('Password updated successfully! Welcome to Hirly.');
        router.replace('/');
      }
      setIsLoading(false);
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      const { plan, cycle } = router.query;
      const signUpMetadata: Record<string, any> = {
        full_name: fullName
      };
      if (plan) signUpMetadata.plan = plan;
      if (cycle) signUpMetadata.cycle = cycle;

      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: signUpMetadata
        }
      });

      if (signUpErr) {
        setError(signUpErr.message);
      } else {
        showToast('Account created successfully! Welcome to Hirly.');
        const { inviteToken } = router.query;
        router.replace(inviteToken ? `/accept-invite?token=${inviteToken}` : '/');
      }
    } else {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInErr) {
        setError(signInErr.message);
      } else {
        if (data?.session?.access_token) {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001'}/api/bootstrap`, {
              headers: {
                'Authorization': `Bearer ${data.session.access_token}`
              }
            });
            if (res.status === 401 || res.status === 403) {
              const resData = await res.json();
              if (resData.error && resData.error.includes('disabled')) {
                await supabase.auth.signOut();
                setError('Your account has been disabled by the administrator.');
                setIsLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error('Failed to verify account status:', err);
          }
        }

        showToast('Signed in successfully! Welcome back.');
        const { inviteToken } = router.query;
        router.replace(inviteToken ? `/accept-invite?token=${inviteToken}` : '/');
      }
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const { inviteToken } = router.query;
      const redirectUrl = inviteToken 
        ? `${window.location.origin}/auth/callback?inviteToken=${inviteToken}`
        : `${window.location.origin}/auth/callback`;

      const { error: googleErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (googleErr) setError(googleErr.message);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Login');
    }
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
            <span>SaaS Recruitment Portal</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.svg" alt="Hirly Logo" className="h-9 w-9 rounded-xl shadow-md" />
            <h1 className="text-3xl font-black text-white tracking-tight font-display">
              Hirly <span className="text-indigo-500">AI</span>
            </h1>
          </div>
          
          <p className="text-slate-400 text-xs mt-2 font-medium">
            {authMode === 'signup' 
              ? 'Create your agency account to get started' 
              : authMode === 'forgot'
              ? 'Enter your email to reset your password'
              : authMode === 'reset'
              ? 'Choose a new password for your account'
              : 'Sign in to access your recruitment pipeline'}
          </p>
        </div>

        {/* Tab switcher / Mode header */}
        {authMode === 'forgot' ? (
          <div className="text-center mb-6 shrink-0">
            <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">Forgot Password</h2>
          </div>
        ) : authMode === 'reset' ? (
          <div className="text-center mb-6 shrink-0">
            <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">Reset Password</h2>
          </div>
        ) : (
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'signin' 
                  ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white shadow-md shadow-indigo-500/25' 
                  : 'text-slate-400 hover:text-white font-semibold'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'signup' 
                  ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white shadow-md shadow-indigo-500/25' 
                  : 'text-slate-400 hover:text-white font-semibold'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert Panel */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-shake">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold text-rose-300 leading-normal">{error}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {authMode !== 'reset' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {authMode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {authMode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setError(null);
                    }}
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer text-right"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-11 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
          )}

          {(authMode === 'signup' || authMode === 'reset') && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {authMode === 'reset' ? 'Confirm New Password' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-11 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-3 text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : authMode === 'signup' ? (
              'Create Account'
            ) : authMode === 'forgot' ? (
              'Send Reset Link'
            ) : authMode === 'reset' ? (
              'Update Password'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Back to Sign In Link for Forgot Password */}
        {authMode === 'forgot' && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer bg-transparent border-none"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Divider & Google OAuth Button */}
        {(authMode === 'signin' || authMode === 'signup') && (
          <>
            <div className="relative my-6 flex items-center justify-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <div className="absolute inset-x-0 h-px bg-slate-800" />
              <span className="bg-[#07070d] px-3 relative z-10">Or continue with</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
            >
              <GoogleLogo size={18} />
              <span>Continue with Google</span>
            </button>
          </>
        )}

        {/* Back to Home Button */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all group"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-500 mt-6 font-medium leading-normal">
          By signing up, you agree to our Terms of Service and Privacy Policy. All database records are securely isolated per-tenant.
        </p>
      </div>
    </div>
  );
}
