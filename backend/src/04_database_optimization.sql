-- 04_database_optimization.sql
-- database performance optimization and constraints hardening DDL script

-- 1. Create B-tree indexes on foreign keys and commonly filtered columns
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON public.profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

CREATE INDEX IF NOT EXISTS idx_companies_workspace_id ON public.companies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON public.jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

CREATE INDEX IF NOT EXISTS idx_candidates_workspace_id ON public.candidates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON public.candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON public.candidates(phone);

CREATE INDEX IF NOT EXISTS idx_job_candidates_job_id ON public.job_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_candidate_id ON public.job_candidates(candidate_id);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_candidate_id ON public.tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

CREATE INDEX IF NOT EXISTS idx_email_templates_workspace_id ON public.email_templates(workspace_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON public.activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_workspace_id ON public.communication_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_candidate_id ON public.communication_logs(candidate_id);

CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace_id ON public.workspace_roles(workspace_id);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_workspace_id ON public.rbac_audit_logs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- 2. Add foreign keys and cascade delete behaviors
-- Ensure that related child records are cleaned up when workspace, candidate, or job is deleted

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_workspace,
  ADD CONSTRAINT fk_profiles_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS fk_companies_workspace,
  ADD CONSTRAINT fk_companies_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS fk_jobs_workspace,
  ADD CONSTRAINT fk_jobs_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS fk_jobs_company,
  ADD CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS fk_candidates_workspace,
  ADD CONSTRAINT fk_candidates_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.job_candidates
  DROP CONSTRAINT IF EXISTS fk_job_candidates_job,
  ADD CONSTRAINT fk_job_candidates_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS fk_job_candidates_candidate,
  ADD CONSTRAINT fk_job_candidates_candidate FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS fk_tasks_workspace,
  ADD CONSTRAINT fk_tasks_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS fk_tasks_candidate,
  ADD CONSTRAINT fk_tasks_candidate FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;

ALTER TABLE public.email_templates
  DROP CONSTRAINT IF EXISTS fk_email_templates_workspace,
  ADD CONSTRAINT fk_email_templates_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.activity_logs
  DROP CONSTRAINT IF EXISTS fk_activity_logs_workspace,
  ADD CONSTRAINT fk_activity_logs_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.communication_logs
  DROP CONSTRAINT IF EXISTS fk_communication_logs_workspace,
  ADD CONSTRAINT fk_communication_logs_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS fk_communication_logs_candidate,
  ADD CONSTRAINT fk_communication_logs_candidate FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;

ALTER TABLE public.email_configs
  DROP CONSTRAINT IF EXISTS fk_email_configs_workspace,
  ADD CONSTRAINT fk_email_configs_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_roles
  DROP CONSTRAINT IF EXISTS fk_workspace_roles_workspace,
  ADD CONSTRAINT fk_workspace_roles_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.rbac_audit_logs
  DROP CONSTRAINT IF EXISTS fk_rbac_audit_logs_workspace,
  ADD CONSTRAINT fk_rbac_audit_logs_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS fk_invitations_workspace,
  ADD CONSTRAINT fk_invitations_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
