import { motion } from "framer-motion";
import { Mic, Sparkles, User } from "lucide-react";
import { Container } from "../ui/Container";

const bars = Array.from({ length: 22 });

export function VoiceCopilot() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#0d0d1a] via-[#12122a] to-[#0d0d1a] px-6 py-16 shadow-2xl sm:px-12 sm:py-20">
          {/* decorative glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/30 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px]" />

          <div className="relative grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" /> AI Voice Copilot
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Meet Your AI Recruitment Assistant
              </h2>
              <p className="mt-6 max-w-lg text-balance text-lg leading-relaxed text-slate-400">
                Simply speak to Hirely AI like you would to a colleague. Search candidates, send
                emails, move pipeline stages, and get insights — all with your voice.
              </p>

              {/* Mic + waveform */}
              <div className="mt-10 flex items-center gap-5">
                <motion.div
                  animate={{ boxShadow: ["0 0 0 0 rgba(99,102,241,0.5)", "0 0 0 20px rgba(99,102,241,0)"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600"
                >
                  <Mic className="h-7 w-7 text-white" />
                </motion.div>
                <div className="flex h-10 items-end gap-1">
                  {bars.map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-1 rounded-full bg-gradient-to-t from-indigo-500 to-violet-400"
                      animate={{ height: ["20%", "100%", "35%", "80%", "20%"] }}
                      transition={{
                        duration: 1.4 + (i % 5) * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.05,
                      }}
                      style={{ height: "20%" }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Chat mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl"
            >
              <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <p className="text-sm font-medium text-slate-300">Live Voice Session</p>
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="ml-auto flex max-w-[85%] items-start gap-2.5"
                >
                  <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-3 text-sm text-white shadow-lg">
                    "Find React Developers in Ahmedabad"
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <User className="h-4 w-4 text-slate-300" />
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex max-w-[90%] items-start gap-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed text-slate-200">
                    I found <span className="font-semibold text-white">28 candidates</span>.
                    <br />
                    Would you like me to email the top 5?
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="flex gap-2 pl-11"
                >
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 cursor-pointer">
                    Yes, email top 5
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 cursor-pointer">
                    Show me the list
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
