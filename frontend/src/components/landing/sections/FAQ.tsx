import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

const faqs = [
  {
    q: "Can I import Excel data?",
    a: "Yes! Hirly AI supports bulk import of candidates from Excel and CSV files. You can import thousands of records in minutes, with automatic field mapping and duplicate detection.",
  },
  {
    q: "Does AI parse resumes automatically?",
    a: "Absolutely. Simply upload a resume in PDF, DOC, or DOCX format and our AI engine automatically extracts contact details, skills, experience, education, and more — no manual data entry required.",
  },
  {
    q: "Can I add my team?",
    a: "Yes, both the Standard and AI Pro plans include team management with role-based access control, so you can invite recruiters, managers, and admins with the right permissions.",
  },
  {
    q: "Is WhatsApp supported?",
    a: "Yes, Hirly AI integrates with WhatsApp and Email so you can send interview invitations, updates, and offer letters to candidates directly from the platform with one click.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Of course. There are no long-term contracts — you can upgrade, downgrade, or cancel your subscription at any time directly from your billing settings.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" />

        <div className="mx-auto mt-14 max-w-3xl space-y-3">
          {faqs.map((item, i) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
              >
                <span className="font-semibold text-slate-800 dark:text-white">{item.q}</span>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                </motion.span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
