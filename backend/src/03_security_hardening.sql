-- 03_security_hardening.sql
-- principal security hardening DDL script

-- 1. Helper function to fetch the current user's workspace_id securely
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Helper function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- List of tables to enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_payments ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- RLS POLICIES FOR TENANT DATA (SCOPED BY workspace_id)
-- -------------------------------------------------------------

-- Profiles table policy
DROP POLICY IF EXISTS profile_tenant_isolation ON public.profiles;
CREATE POLICY profile_tenant_isolation ON public.profiles
  FOR ALL
  USING (id = auth.uid() OR workspace_id = public.get_user_workspace_id() OR public.is_super_admin());

-- Workspaces table policy (scoped by primary key id)
DROP POLICY IF EXISTS workspace_tenant_isolation ON public.workspaces;
CREATE POLICY workspace_tenant_isolation ON public.workspaces
  FOR ALL
  USING (id = public.get_user_workspace_id() OR public.is_super_admin());

-- General Tenant Scoped Tables Macro
-- We apply a tenant-specific workspace_id check to all main ATS operational tables
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'candidates', 'jobs', 'companies', 'tasks', 'email_templates', 
        'activity_logs', 'communication_logs', 'email_configs', 'workspace_roles', 
        'rbac_audit_logs', 'copilot_tasks', 'job_candidates', 'interviews', 
        'job_notes', 'invitations'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_isolation', tbl);
        EXECUTE format('
            CREATE POLICY %I ON public.%I
            FOR ALL
            USING (workspace_id = public.get_user_workspace_id() OR public.is_super_admin());
        ', tbl || '_tenant_isolation', tbl);
    END LOOP;
END $$;

-- -------------------------------------------------------------
-- RLS POLICIES FOR SYSTEM & SUPERADMIN TABLES
-- -------------------------------------------------------------

-- Subscription Plans Policies (read-only for normal users, full read/write for super admins)
DROP POLICY IF EXISTS plans_read_all ON public.subscription_plans;
CREATE POLICY plans_read_all ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS plans_admin_write ON public.subscription_plans;
CREATE POLICY plans_admin_write ON public.subscription_plans FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS plan_versions_read_all ON public.subscription_plan_versions;
CREATE POLICY plan_versions_read_all ON public.subscription_plan_versions FOR SELECT USING (true);
DROP POLICY IF EXISTS plan_versions_admin_write ON public.subscription_plan_versions;
CREATE POLICY plan_versions_admin_write ON public.subscription_plan_versions FOR ALL USING (public.is_super_admin());

-- Superadmin settings / logs (accessible ONLY by super admins)
DROP POLICY IF EXISTS superadmin_settings_isolation ON public.superadmin_settings;
CREATE POLICY superadmin_settings_isolation ON public.superadmin_settings FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS superadmin_ai_logs_isolation ON public.superadmin_ai_logs;
CREATE POLICY superadmin_ai_logs_isolation ON public.superadmin_ai_logs FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS superadmin_email_logs_isolation ON public.superadmin_email_logs;
CREATE POLICY superadmin_email_logs_isolation ON public.superadmin_email_logs FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS superadmin_tickets_isolation ON public.superadmin_tickets;
CREATE POLICY superadmin_tickets_isolation ON public.superadmin_tickets FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS superadmin_payments_isolation ON public.superadmin_payments;
CREATE POLICY superadmin_payments_isolation ON public.superadmin_payments FOR ALL USING (public.is_super_admin());
