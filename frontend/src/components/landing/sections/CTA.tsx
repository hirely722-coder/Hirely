import { motion } from "framer-motion";
import { ArrowRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 px-6 py-16 text-center shadow-2xl shadow-indigo-500/30 sm:px-16 sm:py-24"
        >
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)]" />

          <h2 className="relative text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to Modernize Your Recruitment Process?
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-balance text-lg text-indigo-100">
            Join hundreds of agencies using Hirly AI to hire faster, automate busywork, and close
            more roles.
          </p>

          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-white text-indigo-600 shadow-xl shadow-black/10 hover:bg-slate-50 hover:shadow-2xl"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
              >
                <CalendarClock className="h-4 w-4" />
                Book Demo
              </Button>
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
