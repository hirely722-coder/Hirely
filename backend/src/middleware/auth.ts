import { supabase } from '../db';

export function getDefaultPermissions(role: string): string[] {
  const roleLower = (role || '').toLowerCase();
  if (roleLower === 'owner') {
    return ['*'];
  }
  if (roleLower === 'admin') {
    return [
      'dashboard.view', 'dashboard.export',
      'candidates.view', 'candidates.add', 'candidates.edit', 'candidates.delete', 'candidates.import', 'candidates.export', 'candidates.upload_resume', 'candidates.download_resume', 'candidates.send_email', 'candidates.send_whatsapp', 'candidates.view_ai_score', 'candidates.run_ai_parsing',
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.publish', 'jobs.close_job', 'jobs.ai_matching',
      'companies.view', 'companies.create', 'companies.edit', 'companies.delete', 'companies.send_candidate_profile', 'companies.view_hiring_history',
      'pipeline.view', 'pipeline.move_candidate', 'pipeline.create_stage', 'pipeline.delete_stage',
      'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.complete', 'tasks.delete',
      'templates.view', 'templates.create', 'templates.edit', 'templates.delete',
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 'copilot.email_writer', 'copilot.search', 'copilot.analytics',
      'analytics.view', 'analytics.export', 'analytics.advanced',
      'team.view', 'team.add', 'team.remove', 'team.edit_role', 'team.suspend',
      'settings.view', 'settings.email', 'settings.theme', 'settings.integrations', 'settings.api_keys', 'settings.workspace'
    ];
  }
  if (roleLower === 'recruiter') {
    return [
      'dashboard.view',
      'candidates.view', 'candidates.add', 'candidates.edit', 'candidates.upload_resume', 'candidates.send_email', 'candidates.send_whatsapp', 'candidates.view_ai_score', 'candidates.run_ai_parsing',
      'jobs.view', 'jobs.ai_matching',
      'companies.view', 'companies.view_hiring_history',
      'pipeline.view', 'pipeline.move_candidate',
      'tasks.view', 'tasks.create', 'tasks.complete',
      'templates.view',
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 'copilot.email_writer', 'copilot.search', 'copilot.analytics'
    ];
  }
  if (roleLower === 'viewer') {
    return [
      'dashboard.view',
      'candidates.view',
      'jobs.view',
      'companies.view',
      'pipeline.view'
    ];
  }
  return [];
}

export function isFeatureLocked(permission: string, lockedFeatures: string[]): boolean {
  if (!lockedFeatures || lockedFeatures.length === 0) return false;
  const locks = new Set(lockedFeatures.map(f => f.toLowerCase()));

  if (locks.has('disable_ai')) {
    const aiPermissions = [
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 
      'copilot.email_writer', 'copilot.search', 'copilot.analytics',
      'candidates.view_ai_score', 'candidates.run_ai_parsing', 'jobs.ai_matching'
    ];
    if (aiPermissions.includes(permission)) return true;
  }
  if (locks.has('disable_voice_ai') && permission === 'copilot.voice') {
    return true;
  }
  if (locks.has('disable_import') && permission === 'candidates.import') {
    return true;
  }
  if (locks.has('disable_export')) {
    const exportPermissions = ['candidates.export', 'dashboard.export', 'analytics.export'];
    if (exportPermissions.includes(permission)) return true;
  }
  if (locks.has('disable_analytics')) {
    const analyticsPermissions = ['analytics.view', 'analytics.export', 'analytics.advanced'];
    if (analyticsPermissions.includes(permission)) return true;
  }
  if (locks.has('disable_templates') && permission.startsWith('templates.')) {
    return true;
  }
  if (locks.has('disable_pipeline') && permission.startsWith('pipeline.')) {
    return true;
  }
  if (locks.has('disable_dashboard') && permission.startsWith('dashboard.')) {
    return true;
  }
  if (locks.has('disable_copilot') && permission.startsWith('copilot.')) {
    return true;
  }
  if (locks.has('disable_email') && permission === 'candidates.send_email') {
    return true;
  }
  if (locks.has('disable_whatsapp') && permission === 'candidates.send_whatsapp') {
    return true;
  }

  return false;
}

export function isFeatureSupportedByPlan(permission: string, planFeatures: Record<string, boolean>): boolean {
  if (Object.keys(planFeatures).length === 0) return true; // Bypass check if plan data not fully initialized
  
  if (permission === 'copilot.voice') {
    return !!planFeatures.ai_voice_copilot;
  }
  if (permission === 'copilot.resume_summary') {
    return !!planFeatures.ai_resume_summary;
  }
  if (permission === 'copilot.email_writer') {
    return !!planFeatures.ai_email_generator;
  }
  if (permission === 'copilot.search') {
    return !!planFeatures.ai_search;
  }
  if (permission === 'jobs.ai_matching') {
    return !!planFeatures.ai_candidate_matching;
  }
  if (permission === 'candidates.run_ai_parsing') {
    return !!planFeatures.resume_parsing;
  }
  if (permission === 'candidates.import') {
    return !!planFeatures.csv_import || !!planFeatures.excel_import;
  }
  if (permission === 'candidates.send_whatsapp') {
    return !!planFeatures.whatsapp_integration;
  }
  if (permission === 'candidates.send_email') {
    return !!planFeatures.email_integration;
  }
  if (permission.startsWith('analytics.')) {
    return !!planFeatures.analytics;
  }
  if (permission.startsWith('activity_logs.')) {
    return !!planFeatures.activity_logs;
  }
  if (permission.startsWith('templates.')) {
    return !!planFeatures.email_templates;
  }
  
  return true;
}

export const requirePermission = (permission: string) => {
  return async (c: any, next: any) => {
    const user = c.get('user') as any;
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (user.is_super_admin) {
      return await next();
    }

    const isTrialActive = user.is_trial && user.subscription_status === 'active' && user.trial_end_date && new Date(user.trial_end_date) >= new Date();
    const isSubscriptionActive = !user.is_trial && user.subscription_status === 'active' && (!user.renewal_date || new Date(user.renewal_date) >= new Date());

    if (!isTrialActive && !isSubscriptionActive) {
      return c.json({ error: 'Upgrade Required: Your trial or subscription has expired.', expired: true }, 403);
    }

    if (!isTrialActive) {
      const planFeatures = user.plan_features || {};
      if (!isFeatureSupportedByPlan(permission, planFeatures)) {
        return c.json({ error: 'Upgrade Required: This feature is not included in your current subscription plan.' }, 403);
      }
    }

    const roleLower = (user.role || '').toLowerCase();

    // 1. Check member-level feature restrictions
    const restrictedFeatures = user.restricted_features || [];
    if (roleLower !== 'owner' && isFeatureLocked(permission, restrictedFeatures)) {
      return c.json({ error: 'Feature Disabled by Administrator' }, 403);
    }

    // 2. Check global workspace locks (Applies to all users)
    const lockedFeatures = user.locked_features || [];
    if (isFeatureLocked(permission, lockedFeatures)) {
      return c.json({ error: 'Feature Disabled by Administrator' }, 403);
    }

    // 3. Check effective permissions
    if (roleLower === 'owner') {
      return await next();
    }

    const permissions = user.permissions || [];
    const hasPerm = permissions.includes(permission) || permissions.includes('*') || permissions.includes(permission.split('.')[0] + '.*');
    
    if (!hasPerm) {
      return c.json({ error: 'Forbidden: Insufficient Permissions' }, 403);
    }

    await next();
  };
};

export const requireSuperAdmin = async (c: any, next: any) => {
  const user = c.get('user') as any;
  if (!user || !user.is_super_admin) {
    return c.json({ error: 'Forbidden: Super Admin access required' }, 403);
  }
  await next();
};

export const authMiddleware = async (c: any, next: any) => {
  if (
    c.req.path === '/api/health' || 
    c.req.path === '/api/superadmin/login' || 
    c.req.path === '/api/public/plans' ||
    c.req.path === '/api/public/testimonials' ||
    c.req.path === '/api/payments/webhook' ||
    c.req.path.startsWith('/api/public/invitations/')
  ) {
    return await next();
  }

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Authorization header is missing' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid session token' }, 401);
  }

  // Fetch profiles to retrieve workspace_id, role, name, email, custom_permissions, restricted_features, is_super_admin, status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_id, role, name, email, custom_permissions, restricted_features, is_super_admin, status')
    .eq('id', user.id)
    .single();

  if (profile && profile.status === 'Disabled') {
    return c.json({ error: 'Unauthorized: Your account has been disabled by the administrator.' }, 401);
  }

  const isOnboardingRoute = 
    (c.req.path === '/api/workspaces' && c.req.method === 'POST') ||
    c.req.path === '/api/invitations/accept';

  if (profileError || !profile || !profile.workspace_id) {
    if (isOnboardingRoute) {
      c.set('user', {
        ...user,
        name: profile?.name || user.email?.split('@')[0],
        email: profile?.email || user.email,
        is_super_admin: profile?.is_super_admin || false
      });
      return await next();
    }
    return c.json({ error: 'Unauthorized: User workspace profile not found' }, 403);
  }

  // Fetch workspace locked features and subscription data
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('locked_features, subscription_plan, subscription_status, billing_cycle, renewal_date, trial_expiry, usage_statistics, subscription_type, trial_start_date, trial_end_date, subscription_start_date, subscription_end_date, plan_id, is_trial, recruiter_assignment_strategy')
    .eq('id', profile.workspace_id)
    .single();

  let wsStatus = workspace?.subscription_status || 'active';
  const isTrial = workspace?.is_trial || false;
  const trialEndDate = workspace?.trial_end_date;

  // Lazy Trial Expiry check
  if (isTrial && wsStatus === 'active' && trialEndDate && new Date(trialEndDate) < new Date()) {
    wsStatus = 'expired';
    await supabase
      .from('workspaces')
      .update({ subscription_status: 'expired' })
      .eq('id', profile.workspace_id);
  }

  // Retrieve features and limits for the active plan
  let activePlan = null;
  const planSlug = workspace?.subscription_plan || 'starter';
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', planSlug)
    .single();

  if (plan) {
    activePlan = plan;
  }

  // Resolve effective permissions (member-specific overrides if defined, else role default)
  let permissions = [];
  if (Array.isArray(profile.custom_permissions) && profile.custom_permissions.length > 0) {
    permissions = profile.custom_permissions;
  } else {
    // Fetch role permissions
    const { data: roleData } = await supabase
      .from('workspace_roles')
      .select('permissions')
      .eq('workspace_id', profile.workspace_id)
      .eq('name', profile.role)
      .single();
    permissions = roleData?.permissions || getDefaultPermissions(profile.role);
  }

  const lockedFeatures = workspace?.locked_features || [];

  c.set('user', {
    ...user,
    workspace_id: profile.workspace_id,
    role: profile.role,
    name: profile.name,
    email: profile.email || user.email,
    permissions,
    locked_features: lockedFeatures,
    restricted_features: profile.restricted_features || [],
    is_super_admin: profile.is_super_admin || false,
    recruiter_assignment_strategy: workspace?.recruiter_assignment_strategy || 'global',
    
    // Bind subscription parameters to request context
    subscription_plan: planSlug,
    subscription_status: wsStatus,
    billing_cycle: workspace?.billing_cycle || 'monthly',
    renewal_date: workspace?.renewal_date,
    trial_expiry: workspace?.trial_expiry,
    usage_statistics: workspace?.usage_statistics || {},
    plan_features: activePlan?.features || {},
    plan_limits: activePlan?.limits || {},
    
    // New Trial and Subscription properties
    subscription_type: workspace?.subscription_type || 'paid',
    trial_start_date: workspace?.trial_start_date,
    trial_end_date: trialEndDate,
    subscription_start_date: workspace?.subscription_start_date,
    subscription_end_date: workspace?.subscription_end_date,
    plan_id: workspace?.plan_id,
    is_trial: isTrial
  });
  await next();
};
