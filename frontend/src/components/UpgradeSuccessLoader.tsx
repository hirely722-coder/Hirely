import React, { useEffect, useState } from 'react';

const upgradeStatuses = [
  "Securing payment channel...",
  "Validating transaction signature...",
  "Upgrading workspace to Pro Recruiter...",
  "Unlocking AI features & databases...",
  "Welcome to Hirly Pro!"
];

export default function UpgradeSuccessLoader() {
  const [statusIndex, setStatusIndex] = useState(0);
  const [isShifted, setIsShifted] = useState(false);

  useEffect(() => {
    // 1. Trigger the "Hirly -> Hirly Pro" transition after 1.2 seconds
    const shiftTimer = setTimeout(() => setIsShifted(true), 1200);

    // 2. Cycle through the upgrade status text messages every 800ms
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev < upgradeStatuses.length - 1 ? prev + 1 : prev));
    }, 800);

    return () => {
      clearTimeout(shiftTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[radial-gradient(55%_45%_at_50%_36%,#f8faff_0%,#ffffff_60%)] z-[99999] flex items-center justify-center font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes breathe {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.94); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes badgeReveal {
          0% { opacity: 0; transform: translateX(12px) scale(0.85); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes statusCycle {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide { 
          0% { transform: translateX(-130%); } 
          100% { transform: translateX(340%); } 
        }
      ` }} />
      
      {/* Premium background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(49,97,245,0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(60%_55%_at_50%_40%,black_0%,transparent_70%)]"></div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Glowing breathing background halo */}
        <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(49,97,245,0.18)_0%,rgba(16,185,129,0.08)_45%,transparent_70%)] blur-[30px] pointer-events-none animate-[breathe_3s_ease-in-out_infinite]" />

        {/* Animated Brand Container */}
        <div className="flex items-center justify-center h-12 relative min-w-[280px]">
          {/* Brand Name "Hirly" with Logo */}
          <div 
            className="flex items-center gap-2.5 transition-all duration-700 ease-out"
            style={{
              transform: isShifted ? 'translateX(-30px)' : 'translateX(0px)',
            }}
          >
            <img src="/logo.svg" alt="Hirly Logo" className="h-8 w-8 rounded-lg shadow-md" />
            <span className="font-sora font-extrabold text-[32px] tracking-tight text-slate-900">
              Hirly
            </span>
          </div>

          {/* Pro Tag (Renders beside Hirly after shift) */}
          {isShifted && (
            <span 
              className="absolute font-sans font-bold text-[13px] tracking-wider uppercase px-2.5 py-1 rounded bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-[0_4px_12px_rgba(49,97,245,0.25)] animate-[badgeReveal_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
              style={{ left: 'calc(50% + 32px)' }}
            >
              Pro
            </span>
          )}
        </div>

        {/* Cycling Status Messages */}
        <div className="h-6 overflow-hidden flex items-center justify-center">
          <span 
            key={statusIndex} 
            className="text-[12.5px] font-semibold text-slate-500 uppercase tracking-widest animate-[statusCycle_0.5s_ease-in-out_forwards]"
          >
            {upgradeStatuses[statusIndex]}
          </span>
        </div>

        {/* Subtle sliding loading bar */}
        <div className="w-[180px] h-[3px] rounded-full bg-slate-100 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 absolute top-0 left-0 w-[40%] animate-[slide_1.8s_cubic-bezier(.45,0,.2,1)_infinite]" />
        </div>
      </div>
    </div>
  );
}
