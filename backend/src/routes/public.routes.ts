import { Hono } from 'hono';
import { supabase } from '../db';
import { keysToCamel } from '../utils';

export const publicRouter = new Hono<{
  Variables: {
    user: any;
  }
}>();

// Health Check
publicRouter.get('/health', (c) => {
  return c.json({ status: 'ok', time: new Date().toISOString() });
});

// Public route to fetch active, public plans (for landing page/signup pricing)
publicRouter.get('/public/plans', async (c) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('status', 'Active')
      .eq('visibility', 'Public')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

const PROFANITY_WORDS = ['spam', 'abuse', 'fake', 'scam', 'fraud', 'crap'];

function hasProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY_WORDS.some(word => lower.includes(word));
}

// Public: Get approved testimonials & live trust stats
publicRouter.get('/public/testimonials', async (c) => {
  try {
    const { data: testimonials, error: testErr } = await supabase
      .from('testimonials')
      .select('*')
      .eq('status', 'Approved')
      .order('created_at', { ascending: false });

    if (testErr) throw testErr;

    const [activeAgenciesCount, totalCandidatesCount, totalJobsCount, resumesParsedCount, aiSearchesCount] = await Promise.all([
      supabase.from('workspaces').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).not('resume_text', 'is', null),
      supabase.from('copilot_tasks').select('*', { count: 'exact', head: true })
    ]);

    const activeAgencies = activeAgenciesCount.count || 0;
    const totalCandidates = totalCandidatesCount.count || 0;
    const totalJobs = totalJobsCount.count || 0;
    const resumesParsed = resumesParsedCount.count || 0;
    const aiSearches = aiSearchesCount.count || 0;

    let csat = 4.9;
    if (testimonials && testimonials.length > 0) {
      const sum = testimonials.reduce((acc, curr) => acc + curr.rating, 0);
      csat = parseFloat((sum / testimonials.length).toFixed(1));
    }

    const hasData = activeAgencies > 0;

    return c.json({
      testimonials: keysToCamel(testimonials || []),
      stats: {
        activeAgencies,
        candidatesManaged: totalCandidates,
        jobsPosted: totalJobs,
        resumesParsed,
        aiSearches,
        csat,
        averageResponseTime: '1.5 hours',
        hasData
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Authenticated: Get current user's existing feedback
publicRouter.get('/testimonials/my-feedback', async (c) => {
  const user = c.get('user') as any;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { data: feedback, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return c.json(feedback ? keysToCamel(feedback) : null);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Authenticated: Submit review/feedback
publicRouter.post('/testimonials', async (c) => {
  const user = c.get('user') as any;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { 
      rating, 
      review, 
      customerName, 
      companyName, 
      designation, 
      website, 
      profilePhoto, 
      companyLogo, 
      consentGiven 
    } = body;

    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }
    if (!review || review.trim().length < 10) {
      return c.json({ error: 'Review must be at least 10 characters long' }, 400);
    }
    if (review.trim().length > 1000) {
      return c.json({ error: 'Review cannot exceed 1000 characters' }, 400);
    }
    if (!customerName || !customerName.trim()) {
      return c.json({ error: 'Customer name is required' }, 400);
    }

    if (hasProfanity(review)) {
      return c.json({ error: 'Your review contains words that violate our content policy. Please revise.' }, 400);
    }

    const { data: existingReview } = await supabase
      .from('testimonials')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReview) {
      const elapsed = Date.now() - new Date(existingReview.created_at).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (elapsed < thirtyDays) {
        return c.json({ error: 'You have already submitted a review recently. You can update or submit a new review after 30 days.' }, 400);
      }
    }

    const { data: testimonial, error: insertErr } = await supabase
      .from('testimonials')
      .insert([{
        workspace_id: user.workspace_id,
        user_id: user.id,
        customer_name: customerName.trim(),
        company_name: companyName?.trim() || null,
        designation: designation?.trim() || null,
        email: user.email,
        website: website?.trim() || null,
        review: review.trim(),
        rating,
        profile_photo: profilePhoto || null,
        company_logo: companyLogo || null,
        consent_given: !!consentGiven,
        status: 'Pending'
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    return c.json({
      success: true,
      message: '🎉 Thank you! Your feedback has been received. Our team will review it before publishing it on our website.',
      testimonial: keysToCamel(testimonial)
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
