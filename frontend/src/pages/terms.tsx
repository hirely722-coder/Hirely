import Head from "next/head";
import { ThemeProvider } from "../components/landing/hooks/useTheme";
import { AnimatedBackground } from "../components/landing/ui/AnimatedBackground";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/sections/Footer";
import { Container } from "../components/landing/ui/Container";

export default function TermsPage() {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 bg-white dark:bg-[#0b0b14]">
        <Head>
          <title>Terms of Service | Hirly AI</title>
          <meta name="description" content="Hirly AI Terms and Conditions of service." />
        </Head>
        <AnimatedBackground />
        <Navbar />
        
        <main className="pt-32 pb-20">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-650 dark:from-indigo-400 dark:to-indigo-300">
                Terms of Service
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                Last updated: July 14, 2026
              </p>

              <div className="mt-12 space-y-8 text-slate-650 dark:text-slate-350 leading-relaxed text-sm">
                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Agreement to Terms</h2>
                  <p>
                    By creating a workspace or signing in to Hirly AI, you agree to comply with and be bound by these Terms of Service. If you are signing up on behalf of an agency or company, you warrant that you have the authority to bind that entity to these conditions.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Use of AI Copilot (Hirly Forge)</h2>
                  <p>
                    Hirly Forge is an AI assistant intended to speed up screening, search, and correspondence tasks. You agree that:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 mt-2">
                    <li>AI recommendations are suggestive only. You are solely responsible for final hiring decisions.</li>
                    <li>You will not use the AI to generate spam outreach or violate anti-discrimination employment laws.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Billing & Payments</h2>
                  <p>
                    Subscription plans are billed on a recurring monthly or annual cycle. Failure to settle outstanding balances will result in workspace features becoming locked. Refund requests are subject to our standard billing policy.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Acceptable Content</h2>
                  <p>
                    You retain all rights to the candidate profiles, resumes, and corporate partner entries you upload. You are responsible for ensuring that this data does not violate third-party intellectual property or privacy rights.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Termination & Support</h2>
                  <p>
                    We reserve the right to suspend or terminate workspaces that violate these terms. For support inquiries or terms clarifications, please email:
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
