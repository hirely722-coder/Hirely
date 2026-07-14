import Head from "next/head";
import { ThemeProvider } from "../components/landing/hooks/useTheme";
import { AnimatedBackground } from "../components/landing/ui/AnimatedBackground";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/sections/Footer";
import { Container } from "../components/landing/ui/Container";

export default function AboutPage() {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 bg-white dark:bg-[#0b0b14]">
        <Head>
          <title>About Us | Hirly AI</title>
          <meta name="description" content="About Hirly AI. Our mission, technology stack, and values in recruitment automation." />
          <meta property="og:title" content="About Us | Hirly AI" />
          <meta property="og:description" content="About Hirly AI. Our mission, technology stack, and values in recruitment automation." />
        </Head>
        <AnimatedBackground />
        <Navbar />
        
        <main className="pt-32 pb-20">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-650 dark:from-indigo-400 dark:to-indigo-300">
                About Us
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                Our mission is to help teams build outstanding organizations through smart recruitment.
              </p>

              <div className="mt-12 space-y-8 text-slate-650 dark:text-slate-350 leading-relaxed text-sm">
                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Story</h2>
                  <p>
                    Hirly AI was founded to bridge the gap between traditional applicant tracking databases and modern machine learning capabilities. Recruiters spend hours scanning profiles and writing emails; we build software to automate these manual cycles so you can focus on building relationships with candidates.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Values</h2>
                  <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li><strong>Privacy First</strong>: Candidate databases are highly confidential. We implement rigorous tenant segregation and data privacy controls.</li>
                    <li><strong>Aesthetic & Simplicity</strong>: Software should be a pleasure to use. We prioritize premium user experiences and snappy responsive layouts.</li>
                    <li><strong>Human-in-the-Loop AI</strong>: AI is a partner that proposes actions; humans remain the decision-makers. We ensure all write operations (like candidate creation or job status updates) go through a clear recruiter approval state.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Get In Touch</h2>
                  <p>
                    We are headquartered in India and serve recruitment agencies globally. Feel free to contact our customer success desk:
                  </p>
                  <ul className="space-y-1.5 mt-3 font-semibold text-slate-900 dark:text-white">
                    <li>Email: <a href="mailto:support@hirly.online" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@hirly.online</a></li>
                    <li>Hotline 1: <a href="tel:+918128385448" className="text-indigo-600 dark:text-indigo-400 hover:underline">+91 8128385448</a></li>
                    <li>Hotline 2: <a href="tel:+919510968449" className="text-indigo-600 dark:text-indigo-400 hover:underline">+91 9510968449</a></li>
                  </ul>
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
