import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  LayoutDashboard, Building2, Briefcase, Users, GitMerge, CheckSquare, 
  Mail, Sparkles, Settings, User, Bell, Search, ChevronRight, Check, X,
  Palette, Menu, LogOut, Shield
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePermission } from '../hooks/usePermission';
import { injectThemeCSS } from './theme/themeHelpers';
import { THEME_PRESETS } from './theme/themePresets';
import { EmailComposeModal, WhatsAppComposeModal, InterviewSchedulerModal, AddTaskModal } from './GlobalModals';
import CSVImportModal from './CSVImportModal';
import BackgroundImportWidget from './BackgroundImportWidget';
import { Company, Job, Candidate, Task, EmailTemplate, CustomTheme } from '../types';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    user,
    logout,
    isLoading,
    companies,
    jobs,
    candidates,
    tasks,
    templates,
    emailConfig,
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
    setNotifications
  } = useApp();

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<string>('slate');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [csvImportInitialType, setCsvImportInitialType] = useState<'companies' | 'jobs' | 'candidates'>('candidates');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if user session is absent and we aren't on the login page or landing page
  useEffect(() => {
    if (!isLoading && !user && router.pathname !== '/login' && router.pathname !== '/') {
      router.replace('/login');
    }
  }, [user, isLoading, router.pathname]);

  // Redirect authenticated users from landing page to recruiter dashboard
  useEffect(() => {
    if (!isLoading && user && router.pathname === '/') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router.pathname]);
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

  // Early Returns placed AFTER all hooks have run
  if (router.pathname === '/login') {
    return <div className="min-h-screen bg-slate-950 text-white font-sans">{children}</div>;
  }

  if (router.pathname === '/') {
    return <>{children}</>;
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
    { name: 'Copilot', path: '/copilot', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const { can, isLocked } = usePermission();

  const isLockedRoute = () => {
    const path = router.pathname;
    if (path === '/dashboard') return isLocked('disable_dashboard');
    if (path === '/pipeline') return isLocked('disable_pipeline');
    if (path === '/templates') return isLocked('disable_templates');
    if (path === '/copilot') return isLocked('disable_copilot') || isLocked('disable_ai');
    return false;
  };

  const isPermittedRoute = () => {
    const path = router.pathname;
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

  return (
    <div className={`flex h-screen bg-slate-50 font-sans overflow-hidden theme-${theme}`}>
      
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
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-100 font-display">
              H
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 font-display tracking-tight leading-none">Hirely</h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-wider font-mono">ATS PORTAL</p>
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
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/50 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-sans">{item.name}</span>
                  </div>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.25 rounded bg-blue-100 text-blue-800 border border-blue-200/40">
                      {item.badge}
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
                placeholder="Search candidates..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            
              {globalSearch.trim() !== '' && (
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

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 font-sans hidden sm:inline">{userName}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded font-medium">ONLINE</span>
            </div>

          </div>
        </header>

        {/* Page Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
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
            useApp().handleAddCommunicationLog(log);
            useApp().addActivityLog('Candidate', `Sent email: "${log.subject}" to ${emailComposeCandidate.name}.`);
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

    </div>
  );
}
