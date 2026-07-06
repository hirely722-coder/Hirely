import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Users,
  Briefcase,
  Workflow,
  Building2,
  BarChart3,
  Mic,
} from "lucide-react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

const tabs = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    stats: [
      { label: "Active Jobs", value: "56" },
      { label: "Candidates", value: "3,842" },
      { label: "Interviews Today", value: "14" },
      { label: "Offers Sent", value: "9" },
    ],
  },
  {
    key: "candidates",
    label: "Candidates",
    icon: Users,
    rows: [
      ["Aditi Sharma", "Senior React Dev", "96% match"],
      ["Rahul Mehta", "Product Designer", "91% match"],
      ["Sara Khan", "DevOps Engineer", "88% match"],
      ["Vikram Rao", "Backend Engineer", "84% match"],
    ],
  },
  {
    key: "jobs",
    label: "Jobs",
    icon: Briefcase,
    rows: [
      ["Senior Frontend Engineer", "TechCorp", "Open"],
      ["Product Manager", "Nimbus Labs", "Open"],
      ["QA Automation Lead", "Fintastic", "Closed"],
      ["UI/UX Designer", "Bright Studio", "Open"],
    ],
  },
  {
    key: "pipeline",
    label: "Pipeline",
    icon: Workflow,
    columns: [
      { name: "Sourced", items: ["A. Sharma", "K. Verma", "R. Iyer"] },
      { name: "Screening", items: ["S. Khan", "P. Nair"] },
      { name: "Interview", items: ["R. Mehta"] },
      { name: "Offer", items: ["V. Rao"] },
    ],
  },
  {
    key: "companies",
    label: "Companies",
    icon: Building2,
    rows: [
      ["TechCorp Inc.", "8 open roles", "Recruiter: Neha"],
      ["Nimbus Labs", "3 open roles", "Recruiter: Aman"],
      ["Fintastic", "5 open roles", "Recruiter: Priya"],
      ["Bright Studio", "2 open roles", "Recruiter: Dev"],
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BarChart3,
    bars: [40, 65, 50, 80, 60, 95, 70],
  },
  {
    key: "voice",
    label: "Voice AI",
    icon: Mic,
    transcript: [
      "\"Show me all candidates for Product Manager\"",
      "AI: Found 17 matching candidates, sorted by score.",
    ],
  },
];

export function Screenshots() {
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((t) => t.key === active)!;

  return (
    <section id="screenshots" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Product Tour"
          title="A Closer Look Inside Hirely AI"
          subtitle="Explore the modules that power your entire recruitment workflow — beautifully designed, effortlessly fast."
        />

        <div className="mt-14 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 cursor-pointer ${
                active === tab.key
                  ? "border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                  : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-400/20 via-violet-400/10 to-blue-400/20 blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-1.5 border-b border-slate-200/60 px-4 py-3 dark:border-white/10">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-4 text-xs text-slate-400">app.hirely.ai/{current.key}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="min-h-[340px] p-6 sm:p-8"
              >
                {current.stats && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {current.stats.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-2xl border border-slate-200/60 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5"
                      >
                        <p className="text-xs text-slate-400">{s.label}</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {current.rows && (
                  <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/10">
                    {current.rows.map((row, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-5 py-4 text-sm ${
                          i !== current.rows!.length - 1 ? "border-b border-slate-200/60 dark:border-white/10" : ""
                        }`}
                      >
                        <span className="font-semibold text-slate-800 dark:text-white">{row[0]}</span>
                        <span className="text-slate-400">{row[1]}</span>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {row[2]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {current.columns && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {current.columns.map((col) => (
                      <div
                        key={col.name}
                        className="rounded-xl border border-slate-200/60 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-300">
                          {col.name}
                        </p>
                        <div className="space-y-2">
                          {col.items.map((it) => (
                            <div
                              key={it}
                              className="rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                            >
                              {it}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {current.bars && (
                  <div className="flex h-56 items-end gap-4 px-4">
                    {current.bars.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: i * 0.06 }}
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-400"
                      />
                    ))}
                  </div>
                )}

                {current.transcript && (
                  <div className="mx-auto max-w-lg space-y-4 pt-6">
                    {current.transcript.map((t, i) => (
                      <div
                        key={i}
                        className={`rounded-2xl px-5 py-3 text-sm ${
                          i === 0
                            ? "ml-auto w-fit bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                            : "w-fit bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                        }`}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}
