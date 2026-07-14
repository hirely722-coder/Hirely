import Head from "next/head";
import { ThemeProvider } from "../components/landing/hooks/useTheme";
import { AnimatedBackground } from "../components/landing/ui/AnimatedBackground";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/sections/Footer";
import { Container } from "../components/landing/ui/Container";

export default function PrivacyPage() {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 bg-white dark:bg-[#0b0b14]">
        <Head>
          <title>Privacy Policy | Hirly AI</title>
          <meta name="description" content="Hirly AI Privacy Policy. Learn how we handle, collect, and protect your workspace data." />
          <meta property="og:title" content="Privacy Policy | Hirly AI" />
          <meta property="og:description" content="Hirly AI Privacy Policy. Learn how we handle, collect, and protect your workspace data." />
        </Head>
        <AnimatedBackground />
        <Navbar />
        
        <main className="pt-32 pb-20">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-650 dark:from-indigo-400 dark:to-indigo-300">
                Privacy Policy
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                Last updated: July 14, 2026
              </p>

              <div className="mt-12 space-y-8 text-slate-650 dark:text-slate-350 leading-relaxed text-sm">
                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
                  <p>
                    We collect workspace configurations, recruiter profile details, email templates, and candidate profiles (including parsed resume text) that you manually input or upload via CSV files or documents to provide our applicant tracking services.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. How We Use Your Data</h2>
                  <p>
                    We use your data strictly to facilitate recruiter workflows, manage task assignments, compile metrics summaries, and execute AI Copilot (Hirly Forge) queries like resume summarization and candidate matchmaking on your request.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Third-Party Integrations & Sub-Processors</h2>
                  <p>
                    We leverage standard database and AI utilities to run the application:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 mt-2">
                    <li><strong>Supabase</strong>: Host your database records and authenticate sessions securely.</li>
                    <li><strong>Eden AI</strong>: Processes prompt summaries and query matches (powered by Gemma 4 31B and similar LLMs) on-demand. No data is stored or used for training model baselines.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Data Security & Least-Privilege</h2>
                  <p>
                    We enforce strict role-based access checks (RBAC) to ensure recruiters and viewers can only read information within their permitted scope. Your candidate databases and private notes are fully isolated inside your workspace boundary.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Contact Information</h2>
                  <p>
                    If you have questions about how we handle user-generated content, reach out to our privacy compliance officer at:
                  </p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    Email: <a href="mailto:support@hirly.online" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@hirly.online</a>
                  </p>
                </section>
              </div>
            </div>
          </Container>
        </main>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
}
