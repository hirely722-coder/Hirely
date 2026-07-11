import { motion } from "framer-motion";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

const stats = [
  { value: "95%", label: "Reduction in manual work" },
  { value: "10x", label: "Faster candidate search" },
  { value: "5000+", label: "Records imported in minutes" },
  { value: "AI Powered", label: "Every recruitment workflow" },
];

export function Stats() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Why Hirly AI"
          title="Why Choose Hirly AI"
          subtitle="Real results for recruitment agencies that switched from spreadsheets and legacy ATS tools."
        />

        <div className="mt-16 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50 p-8 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:from-white/[0.06] dark:to-white/[0.02]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
              <p className="bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
