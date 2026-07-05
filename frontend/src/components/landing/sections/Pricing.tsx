import { motion } from "framer-motion";
import { Check, Bot } from "lucide-react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";

const allFeatures = [
  "Unlimited Candidates & Jobs",
  "AI Voice Copilot & Commands",
  "AI Candidate Matching & Scoring",
  "AI Resume Parsing & Summaries",
  "AI Email & Tasks Assistant",
  "Companies & Pipeline Management",
  "Email & WhatsApp Integrations",
  "CSV & Excel Bulk Imports",
  "Dashboard Analytics & Insights",
  "Team & Role-Based Access Control",
  "Priority Support",
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, Transparent Pricing"
          subtitle="One plan, complete access. Supercharge your agency with all AI capabilities."
        />

        <div className="mt-16 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -6 }}
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-indigo-400/50 bg-gradient-to-b from-indigo-950 via-[#141428] to-[#0d0d1a] p-8 shadow-2xl shadow-indigo-900/40 sm:p-10"
          >
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-indigo-400/40 animate-glow-pulse" />
            <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-violet-500/20 blur-[90px]" />

            <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
              Everything Included
            </div>

            <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h3 className="relative text-xl font-bold text-white">Hirely AI Premium</h3>
            <p className="relative mt-2 text-sm text-slate-400">
              Get complete access to all AI features and recruitment tools.
            </p>
            <div className="relative mt-6 flex items-end gap-1">
              <span className="text-4xl font-extrabold text-white">₹2,000</span>
              <span className="pb-1 text-sm text-slate-400">/month</span>
            </div>

            <ul className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {allFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/login" className="w-full flex mt-8 relative">
              <Button size="lg" className="w-full">
                Get Started Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
