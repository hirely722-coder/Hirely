-- 05_enterprise_operations.sql
-- database migration schema script for monitoring, job queues, support, and email tracing

-- 1. Create Error Logs Table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  workspace_id UUID,
  browser TEXT,
  device TEXT,
  route TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  request_id TEXT,
  category TEXT DEFAULT 'general'
);

-- Enable RLS & isolation policies on error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS error_logs_tenant_isolation ON public.error_logs;
CREATE POLICY error_logs_tenant_isolation ON public.error_logs
  FOR ALL
  USING (workspace_id = public.get_user_workspace_id() OR public.is_super_admin());

-- 2. Create Background Jobs Table
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS & isolation policies on background_jobs
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS background_jobs_tenant_isolation ON public.background_jobs;
CREATE POLICY background_jobs_tenant_isolation ON public.background_jobs
  FOR ALL
  USING (workspace_id = public.get_user_workspace_id() OR public.is_super_admin());

-- 3. Create Email Queue Table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  template_id UUID,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, sending, delivered, failed
  retry_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS & isolation policies on email_queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_queue_tenant_isolation ON public.email_queue;
CREATE POLICY email_queue_tenant_isolation ON public.email_queue
  FOR ALL
  USING (workspace_id = public.get_user_workspace_id() OR public.is_super_admin());

-- 4. Add Attachment column to Support Tickets
ALTER TABLE public.superadmin_tickets ADD COLUMN IF NOT EXISTS attachment TEXT;

-- 5. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_workspace ON public.error_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_workspace ON public.background_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_workspace ON public.email_queue(workspace_id);
