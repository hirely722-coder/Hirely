import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Bot, Zap, Crown, Sparkles, RefreshCw, X } from "lucide-react";
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
  const [selectedPlanForTrialModal, setSelectedPlanForTrialModal] = useState<any>(null);

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
          title="Simple, Transparent Pricing"
          subtitle="One plan, complete access. Supercharge your agency with all AI capabilities."
        />

        {/* Toggle Billing Cycle */}
        <div className="mt-8 flex justify-center items-center gap-3 relative z-10">
          <span className={`text-xs font-bold uppercase tracking-wider ${billingCycle === "monthly" ? "text-white font-extrabold" : "text-slate-400 font-semibold"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-10 h-6 bg-slate-800 rounded-full p-1 relative transition-colors duration-300"
          >
            <div className={`w-4 h-4 bg-indigo-500 rounded-full transition-transform duration-300 ${billingCycle === "yearly" ? "translate-x-4" : ""}`} />
          </button>
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-white font-extrabold" : "text-slate-400 font-semibold"}`}>
            Yearly
            <span className="text-[9px] px-1.5 py-0.25 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-400/25">Save 20%</span>
          </span>
        </div>

        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
            <span>Loading pricing plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-16 text-center text-xs text-slate-400">
            No public plans available at this moment. Please check back later.
          </div>
        ) : (
          <div className={`mt-16 mx-auto px-4 md:px-0 flex flex-col items-center gap-8 ${
            plans.length === 1 
              ? "max-w-2xl" 
              : "grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl"
          }`}>
            {plans.map((plan, idx) => {
              const Icon = IconMap[plan.planIcon] || Bot;
              const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              
              // Extract primary features list to show on card
              const highlightFeatures = Object.keys(plan.features || {})
                .filter(k => plan.features[k])
                .slice(0, 11) // Display up to 11 features matching the old layout length
                .map(k => k.replace(/_/g, " "));

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-indigo-400/50 bg-gradient-to-b from-indigo-950 via-[#141428] to-[#0d0d1a] p-8 shadow-2xl shadow-indigo-900/40 sm:p-10"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-indigo-400/40 animate-glow-pulse" />
                  <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-[90px]" />
                  <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-violet-500/20 blur-[90px]" />

                  {plan.popularBadge && (
                    <div className="absolute right-6 top-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-lg z-10">
                      Popular Choice
                    </div>
                  )}

                  <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40 z-10">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="relative text-xl font-bold text-white z-10">{plan.name}</h3>
                  <p className="relative mt-2 text-sm text-slate-400 z-10">
                    {plan.shortDescription}
                  </p>

                  <div className="relative mt-6 flex items-end gap-2 z-10">
                    {/* Render a mock pre-discounted price if it is a Pro Recruiter plan */}
                    {plan.slug === "growth" && billingCycle === "monthly" && (
                      <span className="text-xl font-bold text-slate-500 line-through decoration-rose-500/70 decoration-2">₹3,000</span>
                    )}
                    {plan.slug === "growth" && billingCycle === "yearly" && (
                      <span className="text-xl font-bold text-slate-500 line-through decoration-rose-500/70 decoration-2">₹36,000</span>
                    )}
                    <span className="text-4xl font-extrabold text-white font-mono">₹{price.toLocaleString()}</span>
                    <span className="pb-1 text-sm text-slate-400">/{billingCycle === "monthly" ? "month" : "year"}</span>
                  </div>

                  {plan.trialDays > 0 && (
                    <p className="relative mt-2 text-xs font-semibold text-amber-400/90 z-10">
                      ✨ {plan.trialDays} Day Free Trial included in this plan!
                    </p>
                  )}

                  <ul className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 z-10">
                    {highlightFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                        <span className="capitalize">{f}</span>
                      </li>
                    ))}
                    {Object.keys(plan.limits || {}).map(lk => {
                      const limitVal = plan.limits[lk];
                      if (limitVal === 'unlimited') return null;
                      const cleanLabel = lk.replace(/max_/g, "").replace(/_/g, " ");
                      return (
                        <li key={lk} className="flex items-start gap-2.5 text-sm text-slate-400 italic font-medium">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                          <span className="capitalize">Up to {limitVal} {cleanLabel}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {plan.monthlyPrice === 0 ? (
                    <Link href={`/login?plan=${plan.slug}&cycle=${billingCycle}`} className="w-full flex mt-8 relative z-10">
                      <Button size="lg" className="w-full">
                        Get Started for Free
                      </Button>
                    </Link>
                  ) : (
                    <div className="w-full flex mt-8 relative z-10">
                      <Button 
                        size="lg" 
                        className="w-full"
                        onClick={() => setSelectedPlanForTrialModal(plan)}
                      >
                        Subscribe Now
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </Container>

      {selectedPlanForTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlanForTrialModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[10px] font-bold text-indigo-300 mb-3 uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                <span>Subscription Options</span>
              </div>
              <h3 className="text-xl font-bold text-white font-display">
                Choose How to Start
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Experience full access to {selectedPlanForTrialModal.name} with all premium features enabled.
              </p>
            </div>

            <div className="space-y-4">
              <Link 
                href={`/login?plan=${selectedPlanForTrialModal.slug}&cycle=${billingCycle}&trial=true`}
                onClick={() => setSelectedPlanForTrialModal(null)}
                className="block w-full animate-pulse hover:animate-none"
              >
                <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs text-center shadow-lg transition-all cursor-pointer border border-indigo-400/30">
                  <div className="font-extrabold text-sm flex items-center justify-center gap-1">
                    <Sparkles className="h-4 w-4 text-amber-300" /> Start 7-Day Free Trial
                  </div>
                  <div className="text-[10px] text-indigo-200 mt-0.5 font-normal">100% unrestricted access, upgrade or cancel anytime</div>
                </div>
              </Link>

              <Link 
                href={`/login?plan=${selectedPlanForTrialModal.slug}&cycle=${billingCycle}`}
                onClick={() => setSelectedPlanForTrialModal(null)}
                className="block w-full"
              >
                <div className="w-full p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs text-center border border-slate-700 transition-all cursor-pointer">
                  <div className="font-extrabold text-sm">Subscribe Immediately</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-normal">Skip trial and set up paid billing cycle now</div>
                </div>
              </Link>
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-500">
              No credit card required for trial. Cancel anytime.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
