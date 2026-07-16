-- 07_email_integrations.sql
-- Run this in Supabase SQL Editor to enable the Email Integration feature.
-- Without this migration, the backend automatically uses an in-memory fallback
-- so the feature still works — but data will be lost on server restart.

-- ── Email Integrations Table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email TEXT NOT NULL,
  display_name TEXT,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  sender_name TEXT,
  status TEXT NOT NULL DEFAULT 'Connected'
    CHECK (status IN ('Connected', 'Warning', 'Error', 'Needs Reconnect')),
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_workspace_provider UNIQUE (workspace_id, provider)
);

-- Row Level Security
ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_integrations_tenant_isolation ON public.email_integrations;
CREATE POLICY email_integrations_tenant_isolation ON public.email_integrations
  FOR ALL USING (workspace_id = public.get_user_workspace_id());

-- ── Email Integration Audit Logs ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL
    CHECK (action IN ('Connected', 'Disconnected', 'Reconnect', 'Test Email', 'Token Refresh', 'Email Sent', 'Provider Error')),
  ip_address TEXT,
  status TEXT NOT NULL CHECK (status IN ('Success', 'Failure')),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.email_integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_integration_logs_tenant_isolation ON public.email_integration_logs;
CREATE POLICY email_integration_logs_tenant_isolation ON public.email_integration_logs
  FOR SELECT USING (workspace_id = public.get_user_workspace_id());

-- ── Performance Indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_email_integrations_workspace ON public.email_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_integration_logs_workspace ON public.email_integration_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_integration_logs_created ON public.email_integration_logs(created_at DESC);
