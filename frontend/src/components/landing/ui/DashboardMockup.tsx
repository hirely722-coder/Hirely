import { motion } from "framer-motion";
import {
  LayoutGrid,
  Users,
  Briefcase,
  Building2,
  Workflow,
  Mic,
  BarChart3,
  Search,
  Bell,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { icon: LayoutGrid, active: true },
  { icon: Users, active: false },
  { icon: Briefcase, active: false },
  { icon: Building2, active: false },
  { icon: Workflow, active: false },
  { icon: Mic, active: false },
  { icon: BarChart3, active: false },
];

const candidates = [
  { name: "Aditi Sharma", role: "Senior React Dev", score: 96, color: "from-emerald-400 to-teal-500" },
  { name: "Rahul Mehta", role: "Product Designer", score: 91, color: "from-indigo-400 to-violet-500" },
  { name: "Sara Khan", role: "DevOps Engineer", score: 88, color: "from-amber-400 to-orange-500" },
];

const pipeline = [
  { name: "Sourced", count: 128, color: "bg-slate-400" },
  { name: "Screening", count: 64, color: "bg-blue-400" },
  { name: "Interview", count: 22, color: "bg-violet-400" },
  { name: "Offer", count: 8, color: "bg-emerald-400" },
];

export function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
      className="relative w-full"
    >
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-blue-500/30 blur-2xl" />
      <div className="animate-float relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-2xl shadow-indigo-900/20 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-1 text-xs text-slate-400 dark:bg-white/5">
            <Search className="h-3 w-3" /> app.hirely.ai/dashboard
          </div>
          <Bell className="h-4 w-4 text-slate-400" />
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden flex-col gap-3 border-r border-slate-200/60 px-3 py-4 sm:flex dark:border-white/10">
            {navItems.map((item, i) => (
              <div
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  item.active
                    ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Welcome back</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Recruitment Overview
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" /> +18%
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Candidates", value: "3,842" },
                { label: "Open Jobs", value: "56" },
                { label: "Hires", value: "129" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200/60 bg-white/60 p-2.5 dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                  <p className="text-base font-bold text-slate-800 dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="rounded-xl border border-slate-200/60 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                Hiring Pipeline
              </p>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                {pipeline.map((p, i) => (
                  <motion.div
                    key={p.name}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.count / 2.22}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.15 }}
                    className={p.color}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {pipeline.map((p) => (
                  <div key={p.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${p.color}`} /> {p.name} ({p.count})
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate list */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                Top AI Matches
              </p>
              {candidates.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + i * 0.12 }}
                  className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/60 p-2.5 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${c.color} text-[10px] font-bold text-white`}
                    >
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {c.score}% match
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.3 }}
        className="absolute -left-6 -top-6 hidden items-center gap-2 rounded-2xl border border-white/20 bg-white/80 px-4 py-3 shadow-xl backdrop-blur-xl sm:flex dark:border-white/10 dark:bg-white/10"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-800 dark:text-white">AI Voice Copilot</p>
          <p className="text-[10px] text-slate-400">Listening...</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
