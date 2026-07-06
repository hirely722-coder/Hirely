import { Sparkles, Mail } from "lucide-react";
import { Container } from "../ui/Container";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
    </svg>
  );
}

const linkGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Screenshots", href: "#screenshots" },
      { label: "Testimonials", href: "#testimonials" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-slate-200/70 py-16 dark:border-white/10">
      <Container>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 shadow-lg shadow-indigo-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg tracking-tight">Hirely AI</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              The AI-powered recruitment management platform helping agencies hire smarter, not
              harder.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="mailto:hello@hirely.ai"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {linkGroups.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{group.title}</p>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-8 text-sm text-slate-400 sm:flex-row dark:border-white/10">
          <p>© {new Date().getFullYear()} Hirely AI. All rights reserved.</p>
          <p>Built with ❤️ for modern recruitment teams.</p>
        </div>
      </Container>
    </footer>
  );
}
