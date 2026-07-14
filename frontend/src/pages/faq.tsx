import Head from "next/head";
import { ThemeProvider } from "../components/landing/hooks/useTheme";
import { AnimatedBackground } from "../components/landing/ui/AnimatedBackground";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/sections/Footer";
import { Container } from "../components/landing/ui/Container";

const faqs = [
  {
    question: "What is Hirly AI?",
    answer: "Hirly AI is a modern applicant tracking system (ATS) integrated with a powerful AI Recopilot engine. It helps recruiting agencies and HR departments search pipelines, match candidates to job requirements, and automate outreach schedules."
  },
  {
    question: "How does the AI Recruiter Copilot (Hirly Forge) work?",
    answer: "Hirly Forge is an inline streaming AI assistant. By prompting it directly in the console, you can ask it to search candidates by complex skill configurations, highlight resume credentials, draft follow-up emails, and schedule screening calls."
  },
  {
    question: "Can I import existing candidate sheets?",
    answer: "Yes, Hirly AI features a robust built-in CSV Import Engine with column mapping, data normalization, duplicate detection strategies (skip, update, or create), and full rollback capabilities if an import goes wrong."
  },
  {
    question: "Is my candidate and resume database secure?",
    answer: "Absolutely. We enforce workspace isolation and strict role-based access checks (RBAC). Your resumes and candidate notes are never shared across workspaces and are never used to train global AI models."
  },
  {
    question: "How can I get in touch with customer support?",
    answer: "You can email our customer success team at support@hirly.online, or call us directly at +91 8128385448 or +91 9510968449. We are available to help you configure your workspace integrations."
  }
];

export default function FAQPage() {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 bg-white dark:bg-[#0b0b14]">
        <Head>
          <title>Frequently Asked Questions | Hirly AI</title>
          <meta name="description" content="Hirly AI FAQ. Answers to common questions about candidate parsing, AI copilot matching, and database security." />
        </Head>
        <AnimatedBackground />
        <Navbar />
        
        <main className="pt-32 pb-20">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-650 dark:from-indigo-400 dark:to-indigo-300">
                Frequently Asked Questions
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                Got questions? We have answers. If you don't find what you need here, feel free to contact us.
              </p>

              <div className="mt-12 space-y-8">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border-b border-slate-200 dark:border-white/10 pb-6 last:border-b-0">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5">
                      {faq.question}
                    </h2>
                    <p className="text-slate-650 dark:text-slate-350 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </main>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
}
