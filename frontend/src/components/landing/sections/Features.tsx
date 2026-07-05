import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Building2,
  ScanText,
  Target,
  Mic,
  Workflow,
  MessageSquareText,
  UploadCloud,
  BarChart3,
} from "lucide-react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

const features = [
  {
    icon: Users,
    title: "Candidate Management",
    description: "Manage unlimited candidates with AI-powered resume parsing.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Briefcase,
    title: "Job Management",
    description: "Create, edit, publish and manage jobs easily.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Building2,
    title: "Company Management",
    description: "Manage clients, open positions, hiring progress, and recruiter assignments.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: ScanText,
    title: "AI Resume Parsing",
    description: "Upload resumes and let AI automatically extract all candidate information.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Target,
    title: "AI Candidate Matching",
    description: "Instantly find the best candidates for any job using AI scoring.",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: Mic,
    title: "Voice AI Copilot",
    description:
      'Talk naturally with your AI assistant. "Find React developers." "Email shortlisted candidates." "Move Rahul to Interview."',
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Workflow,
    title: "Pipeline",
    description: "Drag & drop hiring stages to move candidates seamlessly.",
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    icon: MessageSquareText,
    title: "Email & WhatsApp",
    description: "Send interview invitations and candidate updates with one click.",
    color: "from-teal-500 to-emerald-500",
  },
  {
    icon: UploadCloud,
    title: "Bulk Import",
    description: "Import thousands of candidates from Excel or CSV in minutes.",
    color: "from-sky-500 to-indigo-500",
  },
  {
    icon: BarChart3,
    title: "Dashboard",
    description: "Real-time analytics and hiring insights, all in one view.",
    color: "from-orange-500 to-red-500",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Platform"
          title="Everything You Need to Run Your Recruitment Agency"
          subtitle="A complete recruitment operating system — from sourcing to offer — supercharged by AI at every step."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.1 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/30"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/0 to-violet-400/0 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}
              >
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
