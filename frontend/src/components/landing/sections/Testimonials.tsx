import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

const testimonials = [
  {
    name: "Michael Carter",
    role: "Agency Owner",
    company: "Carter Talent Group",
    quote:
      "Hirely AI cut our time-to-hire in half. The AI resume parsing alone saves my team over 20 hours a week. It's the ATS we always wanted.",
    initials: "MC",
  },
  {
    name: "Priya Nanda",
    role: "HR Manager",
    company: "Nimbus Technologies",
    quote:
      "The voice copilot feels like magic — I just ask it to find candidates or send emails and it's done instantly. Our recruiters love it.",
    initials: "PN",
  },
  {
    name: "James O'Connor",
    role: "Recruitment Consultant",
    company: "Bridge Partners",
    quote:
      "We imported 6,000+ candidate records in minutes and the AI matching found perfect fits we would have missed manually. Game changer.",
    initials: "JO",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Testimonials"
          title="Loved by Recruitment Teams Everywhere"
          subtitle="Here's what agency owners, HR managers, and consultants say about Hirely AI."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className="relative flex flex-col rounded-2xl border border-slate-200/70 bg-white/70 p-7 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
            >
              <Quote className="mb-4 h-8 w-8 text-indigo-300 dark:text-indigo-500/40" />
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-200/60 pt-5 dark:border-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
