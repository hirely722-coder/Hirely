-- 06_testimonials.sql
-- Database schema for Testimonials & Feedback System

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  designation TEXT,
  email TEXT NOT NULL,
  website TEXT,
  review TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  profile_photo TEXT,
  company_logo TEXT,
  consent_given BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Hidden')),
  featured BOOLEAN DEFAULT FALSE NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policy: Allow anyone (unauthenticated guest) to read Approved testimonials
DROP POLICY IF EXISTS testimonials_public_select ON public.testimonials;
CREATE POLICY testimonials_public_select ON public.testimonials
  FOR SELECT USING (status = 'Approved');

-- 2. Tenant Select Policy: Allow workspace members to see their own testimonials (even if Pending/Rejected/Hidden)
DROP POLICY IF EXISTS testimonials_tenant_select ON public.testimonials;
CREATE POLICY testimonials_tenant_select ON public.testimonials
  FOR SELECT USING (workspace_id = public.get_user_workspace_id());

-- 3. Tenant Insert Policy: Allow workspace members to create testimonials for their own user_id
DROP POLICY IF EXISTS testimonials_tenant_insert ON public.testimonials;
CREATE POLICY testimonials_tenant_insert ON public.testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id AND workspace_id = public.get_user_workspace_id());

-- 4. Tenant Update Policy: Allow workspace members to edit their own testimonials
DROP POLICY IF EXISTS testimonials_tenant_update ON public.testimonials;
CREATE POLICY testimonials_tenant_update ON public.testimonials
  FOR UPDATE USING (auth.uid() = user_id AND workspace_id = public.get_user_workspace_id());

-- 5. Superadmin Policy: Allow superadmins full control
DROP POLICY IF EXISTS testimonials_superadmin_all ON public.testimonials;
CREATE POLICY testimonials_superadmin_all ON public.testimonials
  FOR ALL USING (public.is_super_admin());
