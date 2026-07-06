import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Sparkles, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";
import { DashboardMockup } from "../ui/DashboardMockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-600 backdrop-blur-sm dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Advanced AI Recruitment Engine
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white"
            >
              Hire Smarter with{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                AI
              </span>
              , Not Harder.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-slate-600 dark:text-slate-400"
            >
              Manage candidates, jobs, companies, emails, AI matching, resume parsing, and
              recruitment workflows from one intelligent platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Link href="/login">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  <PlayCircle className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500 dark:text-slate-400"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Setup in under 5 minutes
              </div>
            </motion.div>
          </div>

          <DashboardMockup />
        </div>
      </Container>
    </section>
  );
}
