import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Bot, Zap, Crown, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Button } from "../ui/Button";

const IconMap: Record<string, any> = {
  User: Bot,
  Zap: Zap,
  Crown: Crown,
  Sparkles: Sparkles
};

export function Pricing() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "https://hirely-backend.hirly-app.workers.dev";
    fetch(`${backendUrl}/api/public/plans`)
      .then((res) => res.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Failed to load plans:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, Transparent Tiers"
          subtitle="Select the perfect subscription plan to supercharge your recruitment agency workflow."
        />

        {/* Toggle Billing Cycle */}
        <div className="mt-8 flex justify-center items-center gap-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${billingCycle === "monthly" ? "text-white font-extrabold" : "text-slate-400 font-semibold"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-10 h-6 bg-slate-800 rounded-full p-1 relative transition-colors duration-300"
          >
            <div className={`w-4 h-4 bg-blue-500 rounded-full transition-transform duration-300 ${billingCycle === "yearly" ? "translate-x-4" : ""}`} />
          </button>
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-white font-extrabold" : "text-slate-400 font-semibold"}`}>
            Yearly
            <span className="text-[9px] px-1.5 py-0.25 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-400/25">Save 20%</span>
          </span>
        </div>

        {loading ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            <span>Loading pricing plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-12 text-center text-xs text-slate-400">
            No public plans available at this moment. Please check back later.
          </div>
        ) : (
          <div className={`mt-12 mx-auto px-4 md:px-0 ${
            plans.length === 1 
              ? "max-w-lg" 
              : plans.length === 2 
                ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl" 
                : "grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl"
          }`}>
            {plans.map((plan, idx) => {
              const Icon = IconMap[plan.planIcon] || Sparkles;
              const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              
              // Extract primary features list to show on card
              const highlightFeatures = Object.keys(plan.features || {})
                .filter(k => plan.features[k])
                .slice(0, 6)
                .map(k => k.replace(/_/g, " "));

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -4 }}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
                    plan.popularBadge 
                      ? "border-blue-600 bg-white/95 shadow-xl shadow-blue-500/10 dark:border-blue-500 dark:bg-slate-900/95 ring-1 ring-blue-500/25 z-10" 
                      : "border-slate-200/80 bg-white/80 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
                  }`}
                >
                  {plan.popularBadge && (
                    <div className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-2.5 py-0.5 text-[9px] font-bold text-white shadow-md">
                      Popular Choice
                    </div>
                  )}

                  <div>
                    <div 
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl shadow-xs"
                      style={{ backgroundColor: `${plan.planColor}15`, border: `1px solid ${plan.planColor}30` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: plan.planColor }} />
                    </div>
                    
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[32px]">
                      {plan.shortDescription}
                    </p>
                    
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹{price.toLocaleString()}</span>
                      <span className="pb-0.5 text-[10px] text-slate-400 font-semibold">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                    </div>

                    {plan.trialDays > 0 && (
                      <div className="mt-2 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded-md w-max">
                        {plan.trialDays} Day Free Trial
                      </div>
                    )}

                    <ul className={`mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-slate-600 dark:text-slate-300 ${
                      plans.length === 1 
                        ? "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2" 
                        : "space-y-2"
                    }`}>
                      {highlightFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs font-semibold">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <span className="capitalize">{f}</span>
                        </li>
                      ))}
                      {Object.keys(plan.limits || {}).map(lk => {
                        const limitVal = plan.limits[lk];
                        if (limitVal === 'unlimited') return null;
                        const cleanLabel = lk.replace(/max_/g, "").replace(/_/g, " ");
                        return (
                          <li key={lk} className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500 italic font-medium">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-800" />
                            <span className="capitalize">Up to {limitVal} {cleanLabel}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <Link href={`/login?plan=${plan.slug}&cycle=${billingCycle}`} className="w-full flex mt-6">
                    <Button 
                      variant={plan.popularBadge ? "primary" : "secondary"} 
                      className="w-full text-xs py-2 h-auto"
                    >
                      {plan.monthlyPrice === 0 ? "Get Started for Free" : "Subscribe Now"}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
