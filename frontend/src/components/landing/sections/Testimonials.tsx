import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Star, Quote, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Users, Briefcase, FileText, Search, Trophy } from "lucide-react";
import Link from 'next/link';
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";

interface Testimonial {
  id: string;
  customerName: string;
  companyName?: string;
  designation?: string;
  website?: string;
  review: string;
  rating: number;
  profilePhoto?: string;
  companyLogo?: string;
  featured: boolean;
}

interface Stats {
  activeAgencies: number;
  candidatesManaged: number;
  jobsPosted: number;
  resumesParsed: number;
  aiSearches: number;
  csat: number;
  averageResponseTime: string;
  hasData: boolean;
}

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const res = await fetch(`${backendUrl}/api/public/testimonials`);
        if (res.ok) {
          const data = await res.json();
          setTestimonials(data.testimonials || []);
          setStats(data.stats || null);
        }
      } catch (err) {
        console.error("Failed to load public testimonials & stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <section id="testimonials" className="py-24 sm:py-32">
        <Container>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-xs font-mono text-slate-400">Loading success stories...</p>
          </div>
        </Container>
      </section>
    );
  }

  const hasTestimonials = testimonials.length > 0;

  return (
    <section id="testimonials" className="relative py-24 sm:py-32 overflow-hidden">
      
      {/* Dynamic Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(99,102,241,0.04)_0%,transparent_70%)] pointer-events-none" />

      <Container>
        {hasTestimonials ? (
          <>
            <SectionHeading
              eyebrow="Success Stories"
              title="Real Reviews from Recruitment Teams"
              subtitle="See how Hirely is transforming the hiring workflows of our partners."
            />

            {/* Testimonials Slider */}
            <div className="mt-16 max-w-4xl mx-auto relative px-4">
              
              <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/40 p-8 md:p-12 shadow-md dark:shadow-xl backdrop-blur-xl">
                
                <Quote className="absolute top-8 right-12 h-16 w-16 text-indigo-500/5 dark:text-indigo-500/10 pointer-events-none" />

                <div className="min-h-[220px] flex flex-col justify-between space-y-6">
                  {/* Stars */}
                  <div className="flex gap-1">
                    {Array.from({ length: testimonials[currentIndex].rating }).map((_, idx) => (
                      <Star key={idx} className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-base md:text-lg text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    "{testimonials[currentIndex].review}"
                  </p>

                  {/* Customer Info */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-250/60 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      {testimonials[currentIndex].profilePhoto ? (
                        <img 
                          src={testimonials[currentIndex].profilePhoto} 
                          alt={testimonials[currentIndex].customerName} 
                          className="h-12 w-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm">
                          {testimonials[currentIndex].customerName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">{testimonials[currentIndex].customerName}</h4>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                          </span>
                          {testimonials[currentIndex].featured && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {testimonials[currentIndex].designation || 'Partner'} &middot; {testimonials[currentIndex].companyName || 'Agency'}
                        </p>
                      </div>
                    </div>

                    {testimonials[currentIndex].companyLogo && (
                      <img 
                        src={testimonials[currentIndex].companyLogo} 
                        alt="Logo" 
                        className="h-7 max-w-[100px] object-contain opacity-60 hover:opacity-100 transition-opacity hidden sm:block" 
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Slider Navigation */}
              {testimonials.length > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button 
                    onClick={handlePrev}
                    className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-500">
                    {currentIndex + 1} / {testimonials.length}
                  </span>
                  <button 
                    onClick={handleNext}
                    className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Phase 1 — Landing Page Logic: Early Adopter Invitation Section */
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            {/* Invitation Content */}
            <div className="md:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> Early Adopter Program
              </div>
              <h2 className="text-3xl md:text-5xl font-black font-display text-slate-900 dark:text-white tracking-tight leading-none">
                🌟 Be One of Our First Success Stories
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                Hirely is currently welcoming its first recruitment agencies. We're working closely with our early customers to build the best AI-powered recruitment platform.
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                Start your <strong>7-day free trial</strong>, explore every feature, and if Hirely helps your hiring process, we'd love to hear your feedback. Your review may be featured here after approval.
              </p>
              
              <div className="flex items-center gap-4 pt-2">
                <Link href="/login" className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2">
                  🚀 Start Free Trial
                </Link>
                <Link href="#features" className="px-6 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 dark:bg-slate-900/60 dark:hover:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:text-slate-950 dark:hover:text-white rounded-xl text-xs font-bold transition-all">
                  Learn More
                </Link>
              </div>
            </div>

            {/* Illustration Card */}
            <div className="md:col-span-5 relative flex items-center justify-center">
              <div className="w-full max-w-sm aspect-square bg-white/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center space-y-6 shadow-md dark:shadow-2xl relative overflow-hidden backdrop-blur-xl">
                
                {/* Visual Background Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                  <Trophy className="h-8 w-8" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Empowering Recruitment</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Designed for fast-growing agencies looking to scrap legacy platforms and spreadsheets.
                  </p>
                </div>

                <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800" />

                <div className="flex gap-2 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono tracking-wider uppercase font-bold">Welcoming Agencies Now</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Phase 7 — Trust Indicators (Stats Section) */}
        <div className="mt-24 border-t border-slate-200/60 dark:border-slate-850 pt-16">
          {stats && stats.hasData ? (
            <div className="space-y-12 animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Platform Health</span>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white font-display leading-none">Growing Strong with Real Results</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                
                {/* Stat 1 */}
                <div className="bg-white/80 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
                  <div className="mx-auto h-10 w-10 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 dark:from-indigo-400 dark:via-violet-400 dark:to-blue-400 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                    {stats.activeAgencies}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Active Agencies</p>
                </div>

                {/* Stat 2 */}
                <div className="bg-white/80 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
                  <div className="mx-auto h-10 w-10 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <p className="bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 dark:from-indigo-400 dark:via-violet-400 dark:to-blue-400 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                    {stats.jobsPosted}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jobs Posted</p>
                </div>

                {/* Stat 3 */}
                <div className="bg-white/80 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
                  <div className="mx-auto h-10 w-10 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 dark:from-indigo-400 dark:via-violet-400 dark:to-blue-400 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                    {stats.resumesParsed}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Resumes Parsed</p>
                </div>

                {/* Stat 4 */}
                <div className="bg-white/80 dark:bg-slate-900/20 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
                  <div className="mx-auto h-10 w-10 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 dark:from-indigo-400 dark:via-violet-400 dark:to-blue-400 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                    {stats.aiSearches}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">AI Searches</p>
                </div>

              </div>

              {/* Extra Satisfaction Stats */}
              <div className="flex justify-center gap-8 text-center text-slate-500 dark:text-slate-450 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{stats.csat} / 5.0</span> Average Customer Rating
                </div>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{stats.averageResponseTime}</span> Avg Response Time
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest">
                🌱 Growing with our first customers.
              </p>
            </div>
          )}
        </div>

      </Container>
    </section>
  );
}
