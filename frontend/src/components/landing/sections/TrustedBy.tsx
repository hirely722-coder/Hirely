import { motion } from "framer-motion";
import { Container } from "../ui/Container";

const logos = [
  "Agency One",
  "Recruit Pro",
  "Talent Hub",
  "Smart Hiring",
  "Future Recruiters",
];

export function TrustedBy() {
  return (
    <section className="relative py-14">
      <Container>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
        >
          Trusted by fast-growing recruitment agencies worldwide
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((logo, i) => (
            <motion.div
              key={logo}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-lg font-bold tracking-tight text-slate-400 opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:text-slate-500"
            >
              {logo}
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
