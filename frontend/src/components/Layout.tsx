import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  LayoutDashboard, Building2, Briefcase, Users, GitMerge, Mail, Sparkles, Settings, 
  LogOut, Shield, ChevronDown, Bell, Menu, X, CheckSquare, Plus, CreditCard, Activity, Database, MessageSquare, Lock,
  Search, Palette, Check, User, ChevronRight, ShieldAlert, Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../utils/supabase';
import { usePermission } from '../hooks/usePermission';
import { injectThemeCSS } from './theme/themeHelpers';
import { THEME_PRESETS } from './theme/themePresets';
import { EmailComposeModal, WhatsAppComposeModal, InterviewSchedulerModal, AddTaskModal } from './GlobalModals';
import { FeedbackModal } from './modals/FeedbackModal';
import CSVImportModal from './CSVImportModal';
import BackgroundImportWidget from './BackgroundImportWidget';
import UpgradeSuccessLoader from './UpgradeSuccessLoader';
import { Company, Job, Candidate, Task, EmailTemplate, CustomTheme } from '../types';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    user,
    logout,
    isLoading,
    isSuperAdmin,
    subscriptionPlan,
    hasAccess,
    hasReachedLimit,
    companies,
    jobs,
    candidates,
    tasks,
    templates,
    emailConfig,
    activityLogs,
    communicationLogs,
    activeImportTask,
    startBackgroundImport,
    handlePauseImport,
    handleResumeImport,
    handleCancelImport,
    handleDownloadImportReport,
    handleViewImportedResults,
    handleRollbackImport,
    setActiveImportTask,
    
    // API actions
    handleAddCompany,
    handleAddJob,
    handleAddCandidate,
    handleUpdateCandidateStage,
    handleAddTask,
    
    // Toast & Modals
    toast,
    showToast,
    
    emailComposeCandidate,
    setEmailComposeCandidate,
    emailComposePreselectedJob,
    setEmailComposePreselectedJob,
    whatsappComposeCandidate,
    setWhatsappComposeCandidate,
    whatsappComposePreselectedJob,
    setWhatsappComposePreselectedJob,
    scheduleInterviewCandidate,
    setScheduleInterviewCandidate,
    addTaskCandidate,
    setAddTaskCandidate,
    notifications,
    setNotifications,
    needsOnboarding,
    isTrialActive,
    isTrialExpired,
    token,
    showUpgradeSuccess,
    setShowUpgradeSuccess,
    handleAddCommunicationLog,
    addActivityLog,
    workspaceCreatedAt,
    realtimeStatus
  } = useApp();

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<string>('slate');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [csvImportInitialType, setCsvImportInitialType] = useState<'companies' | 'jobs' | 'candidates'>('candidates');

  const [isOffline, setIsOffline] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const goOnline = () => {
        setIsOffline(false);
        showToast('✓ Back online! Reconnected successfully.', 'success');
      };
      const goOffline = () => {
        setIsOffline(true);
        showToast('⚠️ You are offline. Changes will sync when reconnected.', 'error');
      };
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Feedback trigger logic (Phase 2 & 8)
  useEffect(() => {
    if (!mounted || !user || !token || needsOnboarding) return;

    const submitted = localStorage.getItem('hirely_feedback_submitted') === 'true';
    if (submitted) return;

    const dismissedAt = localStorage.getItem('hirely_feedback_dismissed_at');
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (elapsed < thirtyDays) return;
    }

    const checkFeedback = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const res = await fetch(`${backendUrl}/api/testimonials/my-feedback`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const fb = await res.json();
          if (fb && fb.id) {
            localStorage.setItem('hirely_feedback_submitted', 'true');
            return;
          }
        }

        const has5Resumes = candidates.filter(c => c.resumeFileName || c.resumeText).length >= 5;
        const has2Jobs = jobs.length >= 2;
        const has20Candidates = candidates.length >= 20;
        const sentEmails = Array.isArray(communicationLogs) && 
          communicationLogs.filter(log => log.type?.toLowerCase() === 'email').length > 0;

        const usedAiParsing = Array.isArray(activityLogs) && activityLogs.some(log => 
          log.description?.toLowerCase().includes('parse') || 
          log.description?.toLowerCase().includes('resume')
        );
        const usedAiMatching = Array.isArray(activityLogs) && activityLogs.some(log => 
          log.description?.toLowerCase().includes('match') || 
          log.description?.toLowerCase().includes('copilot')
        );

        const completedOnboarding = companies.length > 0 && jobs.length > 0 && candidates.length > 0;

        const usedFor5Days = workspaceCreatedAt 
          ? (Date.now() - new Date(workspaceCreatedAt).getTime() >= 5 * 24 * 60 * 60 * 1000) 
          : false;

        const shouldPrompt = 
          usedFor5Days || 
          has5Resumes || 
          has2Jobs || 
          has20Candidates || 
          sentEmails || 
          usedAiParsing || 
          usedAiMatching || 
          completedOnboarding;

        if (shouldPrompt) {
          setIsFeedbackOpen(true);
        }
      } catch (e) {
        console.error('Error evaluating feedback trigger:', e);
      }
    };

    const timer = setTimeout(checkFeedback, 5000);
    return () => clearTimeout(timer);
  }, [mounted, user, token, needsOnboarding, candidates, jobs, communicationLogs, activityLogs, companies, workspaceCreatedAt]);

  // Redirect to login if user session is absent and we aren't on login, landing, onboarding, invite, or callback pages
  useEffect(() => {
    if (!isLoading && !user && router.pathname !== '/login' && router.pathname !== '/' && router.pathname !== '/onboarding' && router.pathname !== '/accept-invite' && router.pathname !== '/auth/callback') {
      router.replace('/login');
    }
  }, [user, isLoading, router.pathname]);

  // Redirect to onboarding if user is logged in but lacks a workspace, and is trying to access dashboard pages
  useEffect(() => {
    if (!isLoading && user && needsOnboarding && router.pathname !== '/onboarding' && router.pathname !== '/accept-invite' && router.pathname !== '/auth/callback') {
      router.replace('/onboarding');
    }
  }, [user, isLoading, needsOnboarding, router.pathname]);

  // Redirect authenticated users from landing page to recruiter dashboard or onboarding
  useEffect(() => {
    if (!isLoading && user && router.pathname === '/') {
      if (needsOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, needsOnboarding, router.pathname]);
  // Load and apply themes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('apex-theme') || 'slate';
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem('apex-custom-theme-active-data');
      if (savedActive) {
        try {
          const themeData = JSON.parse(savedActive);
          if (themeData && themeData.id === theme) {
            injectThemeCSS(themeData);
            return;
          }
        } catch (e) {}
      }

      const matchingPreset = THEME_PRESETS.find((p: CustomTheme) => p.id === theme);
      if (matchingPreset) {
        injectThemeCSS(matchingPreset);
      }
    }
  }, [theme]);

  // Synchronize document.documentElement "dark" class based on active theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const darkThemes = ['dark', 'nord', 'dracula', 'github-dark'];
      let isDark = darkThemes.includes(theme);

      // Check if custom theme is dark
      const savedActive = localStorage.getItem('apex-custom-theme-active-data');
      if (savedActive) {
        try {
          const themeData = JSON.parse(savedActive);
          if (themeData && themeData.id === theme) {
            const textCol = themeData.colors?.textColor || '';
            if (textCol.toLowerCase().startsWith('#f') || textCol.toLowerCase().startsWith('#e') || textCol.toLowerCase().startsWith('#c')) {
              isDark = true;
            }
          }
        } catch (e) {}
      }

      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);
  useEffect(() => {
    if (router.query.import === 'true') {
      const type = (router.query.type as 'companies' | 'jobs' | 'candidates') || 'candidates';
      setCsvImportInitialType(type);
      setIsCSVImportOpen(true);
      // clean query parameter
      const { import: _, type: __, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.query.import, router.query.type, router.pathname]);

  const isExpired = isTrialExpired();
  const showLockout = isExpired && 
    router.pathname !== '/login' && 
    router.pathname !== '/' && 
    router.pathname !== '/onboarding' && 
    router.pathname !== '/accept-invite' && 
    router.pathname !== '/auth/callback';

  useEffect(() => {
    if (showLockout) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://hirely-backend.hirly-app.workers.dev";
      fetch(`${backendUrl}/api/public/plans`)
        .then((res) => res.json())
        .then((data) => {
          setPlans(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error("Failed to load plans in Layout:", err))
        .finally(() => setLoadingPlans(false));
    }
  }, [showLockout]);

  const { can, isLocked } = usePermission();

  // Early Returns placed AFTER all hooks have run
  if (router.pathname === '/login' || router.pathname === '/onboarding' || router.pathname === '/accept-invite' || router.pathname === '/auth/callback') {
    return <div className="min-h-screen bg-slate-950 text-white font-sans">{children}</div>;
  }

  if (router.pathname === '/') {
    return <>{children}</>;
  }

  // Render premium animated brand loader while session data is loading on protected routes
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[radial-gradient(55%_45%_at_50%_36%,#f7f9ff_0%,#ffffff_60%)] font-sans overflow-hidden z-[9999]">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes breathe {
            0%, 100% { opacity: 0.6; transform: translate(-50%, -56%) scale(0.94); }
            50% { opacity: 1; transform: translate(-50%, -56%) scale(1.04); }
          }
          @keyframes draw { to { stroke-dashoffset: 0; } }
          @keyframes draw-cross { to { stroke-dashoffset: 0; } }
          @keyframes sparkIn { to { opacity: 1; } }
          @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
          @keyframes statusCycle {
            0% { opacity: 0; transform: translateY(4px); }
            6% { opacity: 1; transform: translateY(0); }
            22% { opacity: 1; transform: translateY(0); }
            28% { opacity: 0; transform: translateY(-4px); }
            100% { opacity: 0; }
          }
          @keyframes slide { 0% { transform: translateX(-130%); } 100% { transform: translateX(340%); } }
          @media (prefers-reduced-motion: reduce) {
            .draw-line, .spark-group, .word-group, .progress-group { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; transform: none !important; }
            .halo-layer { animation: none !important; }
            .slide-bar { animation: none !important; width: 55% !important; }
            .status-layer { animation: none !important; opacity: 0 !important; }
            .status-layer:first-child { opacity: 1 !important; }
          }
        ` }} />
        <div className="relative w-full h-screen flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:26px_26px] [mask-image:radial-gradient(60%_55%_at_50%_40%,black_0%,transparent_72%)]"></div>
          <div className="relative flex flex-col items-center gap-[26px]">
            <div className="halo-layer absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-[56%] bg-[radial-gradient(circle,rgba(49,97,245,0.14)_0%,rgba(16,185,129,0.06)_45%,transparent_72%)] blur-[20px] pointer-events-none animate-[breathe_3.2s_ease-in-out_infinite]"></div>
            <div className="relative w-[120px] h-[120px] drop-shadow-[0_10px_22px_rgba(49,97,245,0.16)]">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b7dff"/>
                    <stop offset="100%" stopColor="#2447d8"/>
                  </linearGradient>
                  <linearGradient id="crossGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3161f5"/>
                    <stop offset="100%" stopColor="#10b981"/>
                  </linearGradient>
                </defs>
                <line className="draw-line fill-none stroke-[url(#barGrad)] stroke-[15px] animate-[draw_0.85s_cubic-bezier(.65,0,.35,1)_forwards] [stroke-dasharray:160] [stroke-dashoffset:160] [animation-delay:0.05s]" strokeLinecap="round" x1="62" y1="42" x2="62" y2="158"/>
                <line className="draw-line fill-none stroke-[url(#barGrad)] stroke-[15px] animate-[draw_0.85s_cubic-bezier(.65,0,.35,1)_forwards] [stroke-dasharray:160] [stroke-dashoffset:160] [animation-delay:0.25s]" strokeLinecap="round" x1="138" y1="42" x2="138" y2="158"/>
                <line className="draw-line fill-none stroke-[url(#crossGrad)] stroke-[13px] animate-[draw-cross_0.6s_cubic-bezier(.65,0,.35,1)_forwards] [stroke-dasharray:90] [stroke-dashoffset:90] [animation-delay:0.55s]" strokeLinecap="round" x1="62" y1="100" x2="138" y2="100"/>
                <g className="spark-group opacity-0 animate-[sparkIn_0.4s_ease_forwards] [animation-delay:1.05s]">
                  <circle className="drop-shadow-[0_0_5px_rgba(16,185,129,0.55)]" r="5" fill="#10b981">
                    <animateMotion
                      path="M62,100 L138,100 L62,100"
                      keyTimes="0;0.5;1"
                      keySplines="0.45 0 0.2 1;0.45 0 0.2 1"
                      calcMode="spline"
                      dur="2.4s"
                      repeatCount="indefinite"/>
                  </circle>
                </g>
              </svg>
            </div>
            <div className="word-group flex flex-col items-center gap-2.5 opacity-0 translate-y-1.5 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:1.15s]">
              <div className="flex items-center gap-2 font-sora font-bold text-[21px] tracking-[0.02em] text-[#0f172a]">
                <img src="/logo.svg" alt="Hirly Logo" className="h-6 w-6 rounded-md shadow-sm animate-pulse" />
                <span>Hirly</span>
              </div>
              <div className="text-[11.5px] text-[#64748b] font-semibold tracking-[0.12em] uppercase h-4 relative min-w-[230px] text-center">
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:0s]">Setting up your workspace</span>
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:1.8s]">Syncing your pipelines</span>
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:3.6s]">Fetching candidates</span>
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:5.4s]">Almost there</span>
              </div>
            </div>
            <div className="progress-group w-[170px] h-[3px] rounded-[3px] bg-[#eef2ff] overflow-hidden opacity-0 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:1.3s]">
              <div className="slide-bar w-[38%] h-full rounded-[3px] bg-gradient-to-r from-[#2447d8] via-[#3161f5] to-[#10b981] animate-[slide_1.6s_cubic-bezier(.45,0,.2,1)_infinite]"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Silent redirect/protection
  }

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'US';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleOpenCSVImport = (type: 'companies' | 'jobs' | 'candidates') => {
    setCsvImportInitialType(type);
    setIsCSVImportOpen(true);
  };

  const handleStartBackgroundImport = (
    fileName: string,
    importType: any,
    rawHeaders: string[],
    rawRows: string[][],
    columnMap: Record<string, number>,
    defaultValues: Record<string, string>,
    duplicateStrategy: any
  ) => {
    startBackgroundImport(fileName, importType, rawHeaders, rawRows, columnMap, defaultValues, duplicateStrategy);
    setIsCSVImportOpen(false);
  };

  const handleGlobalSearchSelect = (name: string) => {
    setGlobalSearch('');
    router.push(`/candidates?search=${encodeURIComponent(name)}`);
  };

  // Nav Items
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Candidates', path: '/candidates', icon: Users },
    { name: 'Pipeline', path: '/pipeline', icon: GitMerge },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, badge: Array.isArray(tasks) ? tasks.filter(t => t.status === 'Pending').length : 0 },
    { name: 'Templates', path: '/templates', icon: Mail },
    { name: 'Hirly Forge', path: '/copilot', icon: Zap },
    { name: 'Support', path: '/support', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];
  
  const isAdminPath = router.pathname.startsWith('/admin');

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Agencies', path: '/admin/agencies', icon: Building2 },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Subscriptions', path: '/admin/subscriptions', icon: Briefcase },
    { name: 'Payments', path: '/admin/payments', icon: CreditCard },
    { name: 'AI Analytics', path: '/admin/ai-analytics', icon: Sparkles },
    { name: 'Email Logs', path: '/admin/email-logs', icon: Mail },
    { name: 'Storage', path: '/admin/storage', icon: Database },
    { name: 'Support', path: '/admin/support', icon: MessageSquare },
    { name: 'Feature Control', path: '/admin/feature-control', icon: Activity },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Shield },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];



  const isLockedRoute = () => {
    const path = router.pathname;
    
    // Check subscription plan access
    if (path === '/copilot' && !hasAccess('ai_voice_copilot') && !hasAccess('ai_search')) {
      return true;
    }
    if (path === '/pipeline' && !hasAccess('pipeline')) {
      return true;
    }
    if (path === '/templates' && !hasAccess('email_templates')) {
      return true;
    }
    if (path === '/dashboard' && !hasAccess('dashboard')) {
      return true;
    }

    if (path === '/dashboard') return isLocked('disable_dashboard');
    if (path === '/pipeline') return isLocked('disable_pipeline');
    if (path === '/templates') return isLocked('disable_templates');
    if (path === '/copilot') return isLocked('disable_copilot') || isLocked('disable_ai');
    return false;
  };

  const isPermittedRoute = () => {
    const path = router.pathname;
    if (path.startsWith('/admin')) return isSuperAdmin;
    if (path === '/dashboard') return can('dashboard.view');
    if (path === '/companies') return can('companies.view');
    if (path === '/jobs') return can('jobs.view');
    if (path === '/candidates') return can('candidates.view');
    if (path === '/pipeline') return can('pipeline.view');
    if (path === '/tasks') return can('tasks.view');
    if (path === '/templates') return can('templates.view');
    if (path === '/copilot') return can('copilot.open');
    if (path === '/settings') return can('settings.view');
    return true;
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.path === '/dashboard') return can('dashboard.view') && !isLocked('disable_dashboard');
    if (item.path === '/companies') return can('companies.view');
    if (item.path === '/jobs') return can('jobs.view');
    if (item.path === '/candidates') return can('candidates.view');
    if (item.path === '/pipeline') return can('pipeline.view') && !isLocked('disable_pipeline');
    if (item.path === '/tasks') return can('tasks.view');
    if (item.path === '/templates') return can('templates.view') && !isLocked('disable_templates');
    if (item.path === '/copilot') return can('copilot.open') && !isLocked('disable_copilot') && !isLocked('disable_ai');
    if (item.path === '/settings') return can('settings.view');
    return true;
  });

  const currentNavItems = isAdminPath ? adminNavItems : filteredNavItems;

  if (showLockout) {
    const isTrial = subscriptionPlan?.isTrial !== false;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-y-auto text-white">
        <div className="w-full max-w-4xl bg-slate-900/55 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative backdrop-blur-md text-center space-y-8 animate-scale-up">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-400/20 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
              <ShieldAlert className="h-3.5 w-3.5" /> {isTrial ? 'Trial Expired' : 'Subscription Expired'}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-display tracking-tight leading-none mt-2">
              {isTrial ? 'Your 7-Day Free Trial Has Ended' : 'Your Subscription Has Expired'}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium max-w-xl mx-auto leading-relaxed">
              {isTrial 
                ? 'We hope you enjoyed Hirely! All your data is safe, but you need to select a plan to unlock full recruitment dashboard capabilities.' 
                : 'Your one-month subscription has ended. All your data is safe, but you need to repurchase a plan to continue using your recruitment portal.'}
            </p>
          </div>

          <div className={`grid grid-cols-1 gap-6 text-left ${plans.length === 1 ? 'max-w-md mx-auto w-full' : plans.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
            {loadingPlans ? (
              <div className="col-span-3 text-center py-12 text-slate-400 text-xs font-mono">
                Loading subscription plans...
              </div>
            ) : plans.length > 0 ? (
              plans.map((plan) => {
                const isRecommended = plan.recommendedBadge || plan.popularBadge;
                return (
                  <div 
                    key={plan.id}
                    className={`bg-slate-800/40 border rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all relative ${
                      isRecommended ? 'bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/50' : 'border-slate-800'
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-indigo-600 border border-indigo-400/20 text-[9px] font-black uppercase rounded-full text-white tracking-wider">
                        Recommended
                      </span>
                    )}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{plan.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">{plan.shortDescription || plan.description || 'Premium recruitment features'}</p>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black font-mono">₹{plan.monthlyPrice?.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400">/month</span>
                      </div>
                      <ul className="space-y-2 text-[10px] text-slate-300 font-medium">
                        {plan.limits && Object.keys(plan.limits).slice(0, 3).map((lKey) => {
                          const limitVal = plan.limits[lKey];
                          const cleanKey = lKey.replace('max_', '').replace('_', ' ');
                          const label = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
                          return (
                            <li key={lKey} className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-indigo-400" />
                              {limitVal === 'unlimited' ? `Unlimited ${label}` : `${limitVal} ${label}`}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isUpgrading) return;
                        setIsUpgrading(true);
                        try {
                          const orderRes = await fetch('/api/payments/create-order', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({ planSlug: plan.slug }),
                          });

                          if (!orderRes.ok) {
                            const errData = await orderRes.json();
                            throw new Error(errData.error || 'Failed to create order');
                          }
                          const orderData = await orderRes.json();

                          const options = {
                            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TCVTzrCeGHT0sg',
                            amount: orderData.amount,
                            currency: orderData.currency,
                            name: "Hirely AI Platform",
                            description: `Upgrade License to ${plan.name.toUpperCase()}`,
                            order_id: orderData.orderId,
                            handler: async function (response: any) {
                              const verifyRes = await fetch('/api/payments/verify-payment', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify({
                                  razorpayPaymentId: response.razorpay_payment_id,
                                  razorpayOrderId: response.razorpay_order_id,
                                  razorpaySignature: response.razorpay_signature,
                                  planSlug: plan.slug
                                })
                              });

                              if (verifyRes.ok) {
                                setShowUpgradeSuccess(true);
                                setTimeout(() => {
                                  window.location.reload();
                                }, 3500);
                              } else {
                                const errData = await verifyRes.json();
                                showToast(errData.error || 'Payment verification failed', 'error');
                              }
                            },
                            prefill: {
                              email: user?.email || '',
                              name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
                            },
                            theme: {
                              color: "#3161f5"
                            },
                            modal: {
                              ondismiss: function () {
                                showToast('Upgrade cancelled by user.', 'error');
                              }
                            }
                          };

                          const rzp = new (window as any).Razorpay(options);
                          rzp.on('payment.failed', function (resp: any) {
                            showToast(`Payment failed: ${resp.error.description}`, 'error');
                          });
                          rzp.open();
                        } catch (err: any) {
                          showToast(err.message || 'Upgrade failed', 'error');
                        } finally {
                          setIsUpgrading(false);
                        }
                      }}
                      disabled={isUpgrading}
                      className={`w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[11px] font-bold transition-all border border-slate-700 cursor-pointer text-center flex items-center justify-center gap-2 ${
                        isUpgrading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isUpgrading ? 'Loading...' : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-12 text-slate-400 text-xs font-mono">
                No active plans found. Please contact administration.
              </div>
            )}
          </div>

          <div className="flex gap-4 items-center justify-center pt-4">
            <button
              onClick={() => logout()}
              className="text-xs text-slate-400 hover:text-white transition-all underline cursor-pointer"
            >
              Sign out from this workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-50 font-sans overflow-hidden theme-${theme} ${isOffline ? 'pt-8' : ''}`}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-slate-950 text-center py-1.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-950" />
          You are currently offline. Working in offline mode. Changes will be synced once connection is restored.
        </div>
      )}
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-50 md:hidden"
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 md:translate-x-0 md:static shrink-0 ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Hirly Logo" className="h-8 w-8 rounded-lg shadow-sm" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 font-display tracking-tight leading-none">Hirly</h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-wider font-mono">
                {isAdminPath ? 'SUPER ADMIN' : 'ATS PORTAL'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isAdminPath && (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-100/50 mb-4 shadow-2xs"
            >
              <LayoutDashboard className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Recruiter Portal</span>
            </Link>
          )}
          <nav className="space-y-1">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.path;
              
              // Determine if navigation link is locked under current subscription plan
              const featureKeyMap: Record<string, string> = {
                'Pipeline': 'pipeline',
                'Templates': 'email_templates',
                'Copilot': 'ai_search',
                'Dashboard': 'dashboard'
              };
              const fKey = featureKeyMap[item.name];
              const isItemLocked = !isAdminPath && fKey ? !hasAccess(fKey) : false;

              return (
                <Link
                  key={item.name}
                  href={isItemLocked ? '#' : item.path}
                  onClick={(e) => {
                    if (isItemLocked) {
                      e.preventDefault();
                      showToast('Upgrade Required: This feature is not included in your current subscription plan.', 'error');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70 border border-transparent'
                  } ${isItemLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-sans flex items-center gap-2">
                      {item.name}
                      {isItemLocked && <Lock className="h-3 w-3 text-slate-400 shrink-0 inline" />}
                    </span>
                  </div>
                  
                  {!isItemLocked && (item as any).badge !== undefined && (item as any).badge > 0 && (
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.25 rounded bg-blue-100 text-blue-800 border border-blue-200/40">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account block */}
        <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase font-sans shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate font-display">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" id="workspace-panel">
        
        {/* Top Header Controls bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white px-4 md:px-8 flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden cursor-pointer"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Simple Search bar */}
            <div className="relative w-36 sm:w-60 md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={isAdminPath ? "Search admin panel..." : "Search candidates..."}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            
              {!isAdminPath && globalSearch.trim() !== '' && (
                <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 text-xs">
                  {candidates
                    .filter(c => c.name.toLowerCase().includes(globalSearch.toLowerCase()))
                    .slice(0, 5)
                    .map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleGlobalSearchSelect(c.name)}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-900 font-sans">{c.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">{c.status}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Account notifications / alert controls */}
          <div className="flex items-center gap-4">
            
            {/* Theme selector dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowThemeDropdown(prev => !prev)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                title="Change Theme"
              >
                <Palette className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono hidden md:inline">Theme</span>
              </button>

              {showThemeDropdown && (
                <div className="absolute right-0 top-11 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 text-xs animate-slide-up">
                  <div className="p-3 bg-slate-50 flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-sans">Visual Themes</span>
                    <button 
                      onClick={() => setShowThemeDropdown(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="p-1.5 space-y-1">
                    {[
                      { id: 'slate', name: 'Classic Slate', color: 'bg-slate-400' },
                      { id: 'emerald', name: 'Deep Emerald', color: 'bg-emerald-500' },
                      { id: 'indigo', name: 'Royal Indigo', color: 'bg-indigo-500' },
                      { id: 'amber', name: 'Warm Amber', color: 'bg-amber-500' },
                      { id: 'dark', name: 'Cosmic Dark', color: 'bg-slate-900' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          localStorage.setItem('apex-theme', t.id);
                          setShowThemeDropdown(false);
                          showToast(`✓ Switched to ${t.name} theme!`, 'success');
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors ${
                          theme === t.id ? 'bg-blue-50/50 border border-blue-100 font-bold' : 'border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-3.5 w-3.5 rounded-full ${t.color} border border-white shadow-2xs`} />
                          <span className="font-medium text-slate-700">{t.name}</span>
                        </div>
                        {theme === t.id && (
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            {/* Notification alert bells */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsDropdown(prev => !prev)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition-colors relative"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-600 rounded-full ring-2 ring-white" />
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200/80 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 text-xs animate-slide-up">
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Notifications</span>
                    <button 
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setShowNotificationsDropdown(false);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  </div>
                  
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">No active alerts.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 hover:bg-slate-50/50 flex items-start gap-2.5 ${n.read ? 'opacity-70' : ''}`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-slate-800 leading-normal">{n.text}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-xs font-semibold text-slate-900 font-sans hidden sm:inline">{userName}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded font-medium">ONLINE</span>
              
              {realtimeStatus === 'SUBSCRIBED' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                  REALTIME
                </span>
              )}
              {realtimeStatus === 'CONNECTING' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-ping" />
                  RT CONNECTING
                </span>
              )}
              {realtimeStatus === 'ERROR' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                  RT ERROR
                </span>
              )}
              {realtimeStatus === 'CLOSED' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-100 rounded font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-slate-500 rounded-full" />
                  RT CLOSED
                </span>
              )}
              {realtimeStatus === 'DISCONNECTED' && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-100 rounded font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-slate-500 rounded-full" />
                  RT DISCONNECTED
                </span>
              )}
            </div>

          </div>
        </header>

        {/* Page Content Panel */}
        <main className={`flex-1 overflow-y-auto bg-slate-50/30 ${router.pathname === '/copilot' ? '' : 'p-4 md:p-8'}`}>
          {isLockedRoute() ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100 shadow-sm animate-pulse">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Feature Disabled by Administrator</h2>
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                This feature has been temporarily deactivated for your workspace. Please contact your account administrator or owner to enable access.
              </p>
            </div>
          ) : !isPermittedRoute() ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
              <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Access Denied</h2>
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                You do not have the required role permissions to view this page. If you believe this is an error, please reach out to your administrator.
              </p>
            </div>
          ) : (
            children
          )}
        </main>

      </div>

      {/* Global Modals overlay */}
      {emailComposeCandidate && (
        <EmailComposeModal 
          candidate={emailComposeCandidate}
          candidates={candidates}
          jobs={jobs}
          templates={templates}
          emailConfig={emailConfig}
          onClose={() => {
            setEmailComposeCandidate(null);
            setEmailComposePreselectedJob(null);
          }}
          preselectedJobId={emailComposePreselectedJob?.id}
          onSend={(log) => {
            // Log it in communications
            handleAddCommunicationLog(log);
            addActivityLog('Candidate', `Sent email: "${log.subject}" to ${emailComposeCandidate.name}.`);
          }}
          showToast={showToast}
        />
      )}

      {whatsappComposeCandidate && (
        <WhatsAppComposeModal 
          candidate={whatsappComposeCandidate}
          candidates={candidates}
          jobs={jobs}
          companyName="Hirely"
          preselectedJob={whatsappComposePreselectedJob || undefined}
          onClose={() => {
            setWhatsappComposeCandidate(null);
            setWhatsappComposePreselectedJob(null);
          }}
          onSend={(log) => {
            useApp().handleAddCommunicationLog(log);
            useApp().addActivityLog('Candidate', `Sent WhatsApp message to ${whatsappComposeCandidate.name}.`);
          }}
          showToast={showToast}
        />
      )}

      {scheduleInterviewCandidate && (
        <InterviewSchedulerModal 
          candidate={scheduleInterviewCandidate}
          jobs={jobs}
          onClose={() => setScheduleInterviewCandidate(null)}
          onSchedule={(title, date, log) => {
            useApp().handleAddCommunicationLog(log);
            const newTask: Task = {
              id: 't_' + Date.now(),
              type: 'Interview',
              title: title,
              candidateId: scheduleInterviewCandidate.id,
              candidateName: scheduleInterviewCandidate.name,
              priority: 'High',
              status: 'Pending',
              dueDate: date.split(' ')[0]
            };
            handleAddTask(newTask);
            useApp().addActivityLog('Candidate', `Scheduled interview with ${scheduleInterviewCandidate.name} on ${date}.`);
          }}
          showToast={showToast}
        />
      )}

      {addTaskCandidate && (
        <AddTaskModal 
          candidate={addTaskCandidate}
          onClose={() => setAddTaskCandidate(null)}
          onAddTask={(task) => {
            handleAddTask(task);
            useApp().addActivityLog('Candidate', `Created task: "${task.title}" for ${addTaskCandidate.name}.`);
          }}
          showToast={showToast}
        />
      )}

      {isCSVImportOpen && (
        <CSVImportModal 
          isOpen={isCSVImportOpen}
          onClose={() => setIsCSVImportOpen(false)}
          companies={companies}
          jobs={jobs}
          onAddCompany={handleAddCompany}
          onAddJob={handleAddJob}
          onAddCandidate={handleAddCandidate}
          showToast={showToast}
          initialType={csvImportInitialType}
          onStartBackgroundImport={handleStartBackgroundImport}
          activeImportTask={activeImportTask}
          onPause={handlePauseImport}
          onResume={handleResumeImport}
          onCancel={handleCancelImport}
          onDownloadReport={() => activeImportTask && handleDownloadImportReport(activeImportTask)}
          onViewResults={() => activeImportTask && handleViewImportedResults(activeImportTask)}
          onRollbackImport={() => activeImportTask && handleRollbackImport(activeImportTask)}
        />
      )}

      {activeImportTask && !isCSVImportOpen && (
        <BackgroundImportWidget
          task={activeImportTask}
          onPause={handlePauseImport}
          onResume={handleResumeImport}
          onCancel={handleCancelImport}
          onClose={() => {
            setActiveImportTask(null);
          }}
          onViewResults={() => handleViewImportedResults(activeImportTask)}
          onDownloadReport={() => handleDownloadImportReport(activeImportTask)}
          onMaximize={() => setIsCSVImportOpen(true)}
        />
      )}

      {/* Elegant Toast Overlay */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[9999] px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100'
        }`}>
          {toast.type === 'success' ? (
            <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
          ) : (
            <div className="h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">!</div>
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {showUpgradeSuccess && <UpgradeSuccessLoader />}

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
