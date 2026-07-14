import Head from "next/head";
import { useState } from "react";
import { ThemeProvider } from "../components/landing/hooks/useTheme";
import { AnimatedBackground } from "../components/landing/ui/AnimatedBackground";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/sections/Footer";
import { Container } from "../components/landing/ui/Container";
import { Button } from "../components/landing/ui/Button";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
    }
  };

  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 bg-white dark:bg-[#0b0b14]">
        <Head>
          <title>Contact Us | Hirly AI</title>
          <meta name="description" content="Contact Hirly AI support, sales, or customer success." />
        </Head>
        <AnimatedBackground />
        <Navbar />
        
        <main className="pt-32 pb-20">
          <Container>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-650 dark:from-indigo-400 dark:to-indigo-300">
                  Contact Us
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                  We are here to support your recruitment pipeline. Get in touch with our product experts.
                </p>

                <div className="mt-10 space-y-6 text-sm text-slate-650 dark:text-slate-350">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Email</span>
                    <a href="mailto:support@hirly.online" className="text-base font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                      support@hirly.online
                    </a>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Phone Lines</span>
                    <div className="flex flex-col gap-1 text-base font-semibold text-slate-900 dark:text-white">
                      <a href="tel:+918128385448" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        +91 8128385448
                      </a>
                      <a href="tel:+919510968449" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        +91 9510968449
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Office Location</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      India
                    </span>
                  </div>
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Send a Message</h2>
                
                {submitted ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    ✓ Thank you! Your message has been sent successfully. We will get back to you shortly.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="name" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Full Name</label>
                      <input
                        id="name"
                        type="text"
                        required
                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-white"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="email" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Address</label>
                      <input
                        id="email"
                        type="email"
                        required
                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-white"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="message" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Message</label>
                      <textarea
                        id="message"
                        required
                        rows={4}
                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:text-white resize-none"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      />
                    </div>

                    <Button type="submit" variant="primary" className="w-full justify-center">
                      Send Inquiry
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </Container>
        </main>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
}
