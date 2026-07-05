import { ThemeProvider } from "../components/landing/hooks/useTheme";
import { AnimatedBackground } from "../components/landing/ui/AnimatedBackground";
import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/sections/Hero";
import { TrustedBy } from "../components/landing/sections/TrustedBy";
import { Features } from "../components/landing/sections/Features";
import { Stats } from "../components/landing/sections/Stats";
import { VoiceCopilot } from "../components/landing/sections/VoiceCopilot";
import { Pricing } from "../components/landing/sections/Pricing";
import { Screenshots } from "../components/landing/sections/Screenshots";
import { Testimonials } from "../components/landing/sections/Testimonials";
import { FAQ } from "../components/landing/sections/FAQ";
import { CTA } from "../components/landing/sections/CTA";
import { Footer } from "../components/landing/sections/Footer";

export default function LandingPage() {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30">
        <AnimatedBackground />
        <Navbar />
        <main>
          <Hero />
          <TrustedBy />
          <Features />
          <Stats />
          <VoiceCopilot />
          <Pricing />
          <Screenshots />
          <Testimonials />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
