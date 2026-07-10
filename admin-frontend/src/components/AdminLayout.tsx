import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  LayoutDashboard, Building2, Users, Briefcase, CreditCard, Sparkles, 
  Mail, Database, MessageSquare, Activity, Shield, Settings, 
  X, Menu, LogOut, Bell, Search
} from 'lucide-react';
import { useApp } from '../context/AdminAppContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isSuperAdmin, isLoading, logout } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Redirect to login if user session is absent and we aren't on the login page
  useEffect(() => {
    if (!isLoading && !user && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isLoading, router.pathname]);

  if (router.pathname === '/login') {
    return <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">{children}</div>;
  }

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
            {/* Soft Ambient Radial Blur Halo */}
            <div className="halo-layer absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-[56%] bg-[radial-gradient(circle,rgba(99,102,241,0.14)_0%,rgba(16,185,129,0.06)_45%,transparent_72%)] blur-[20px] pointer-events-none animate-[breathe_3.2s_ease-in-out_infinite]"></div>
            
            {/* Animated Logo SVG */}
            <div className="relative w-[120px] h-[120px] drop-shadow-[0_10px_22px_rgba(99,102,241,0.16)]">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#4f46e5"/>
                  </linearGradient>
                  <linearGradient id="crossGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1"/>
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

            {/* Custom Admin Status Messages */}
            <div className="word-group flex flex-col items-center gap-2.5 opacity-0 translate-y-1.5 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:1.15s]">
              <div className="font-sora font-bold text-[21px] tracking-[0.02em] text-[#0f172a]">Hirely AI</div>
              <div className="text-[11.5px] text-[#64748b] font-semibold tracking-[0.12em] uppercase h-4 relative min-w-[250px] text-center">
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:0s]">Securing Admin Console</span>
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:1.8s]">Loading Workspace Metrics</span>
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:3.6s]">Connecting Sourcing Analytics</span>
                <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:5.4s]">Almost Ready</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="progress-group w-[170px] h-[3px] rounded-[3px] bg-[#eef2ff] overflow-hidden opacity-0 animate-[fadeUp_0.6s_ease_forwards] [animation-delay:1.3s]">
              <div className="slide-bar w-[38%] h-full rounded-[3px] bg-gradient-to-r from-[#6366f1] via-[#4f46e5] to-[#10b981] animate-[slide_1.6s_cubic-bezier(.45,0,.2,1)_infinite]"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-8 font-sans text-slate-900">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-2xs">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
          You do not have Super Admin permissions to access this platform console. Please log in with a super admin account.
        </p>
        <button
          onClick={logout}
          className="mt-6 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          Sign Out
        </button>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Agencies', path: '/agencies', icon: Building2 },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Subscriptions', path: '/subscriptions', icon: Briefcase },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'AI Analytics', path: '/ai-analytics', icon: Sparkles },
    { name: 'Email Logs', path: '/email-logs', icon: Mail },
    { name: 'Storage', path: '/storage', icon: Database },
    { name: 'Support', path: '/support', icon: MessageSquare },
    { name: 'Feature Control', path: '/feature-control', icon: Activity },
    { name: 'Audit Logs', path: '/audit-logs', icon: Shield },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-950 w-full">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 z-50 md:hidden"
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 md:translate-x-0 md:static shrink-0 ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/10">
              <Shield className="h-4.5 w-4.5 text-white" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-slate-900 font-display tracking-tight leading-none">Hirely AI</h1>
              <p className="text-[9px] text-indigo-600 font-bold mt-0.5 tracking-wider font-mono uppercase">SUPER ADMIN</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70 border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="font-sans">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Account block */}
        <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate font-display">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-100/50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50" id="workspace-panel">
        
        {/* Top Header Controls bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white px-4 md:px-8 flex items-center justify-between shrink-0">
          
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Simple Search bar */}
            <div className="relative w-36 sm:w-60 md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search admin panel..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500/50 bg-slate-50/50 text-slate-950 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Account notifications / alert controls */}
          <div className="flex items-center gap-4">
            <button className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-colors relative">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white" />
            </button>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800 font-sans hidden sm:inline">{userName}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/50 rounded font-bold uppercase">ADMIN</span>
            </div>
          </div>
        </header>

        {/* Page Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
          {children}
        </main>

      </div>
    </div>
  );
}
