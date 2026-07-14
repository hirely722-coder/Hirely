CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

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

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS testimonials_public_select ON public.testimonials;
CREATE POLICY testimonials_public_select ON public.testimonials
  FOR SELECT USING (status = 'Approved');

DROP POLICY IF EXISTS testimonials_tenant_select ON public.testimonials;
CREATE POLICY testimonials_tenant_select ON public.testimonials
  FOR SELECT USING (workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS testimonials_tenant_insert ON public.testimonials;
CREATE POLICY testimonials_tenant_insert ON public.testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id AND workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS testimonials_tenant_update ON public.testimonials;
CREATE POLICY testimonials_tenant_update ON public.testimonials
  FOR UPDATE USING (auth.uid() = user_id AND workspace_id = public.get_user_workspace_id());

DROP POLICY IF EXISTS testimonials_superadmin_all ON public.testimonials;
CREATE POLICY testimonials_superadmin_all ON public.testimonials
  FOR ALL USING (public.is_super_admin());
