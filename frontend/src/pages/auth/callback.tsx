import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../utils/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const { fetchData } = useApp();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Trigger bootstrap payload fetch
        await fetchData();

        const { inviteToken } = router.query;
        if (inviteToken) {
          router.replace(`/accept-invite?token=${inviteToken}`);
        } else {
          // Simply redirect to /dashboard and let global Layout guards handle onboarding if needed
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    };

    if (router.isReady) {
      checkSession();
    }
  }, [router.isReady, router.query]);

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
              <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:0s]">Authorizing session</span>
              <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:1.8s]">Loading user profile</span>
              <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:3.6s]">Verifying workspace</span>
              <span className="status-layer absolute left-0 right-0 opacity-0 translate-y-1 animate-[statusCycle_7.2s_ease-in-out_infinite] [animation-delay:5.4s]">Redirecting</span>
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
