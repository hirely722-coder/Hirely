-- Add trial-related columns to workspaces table
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'paid';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;

-- Add trial settings to superadmin_settings table
ALTER TABLE public.superadmin_settings ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.superadmin_settings ADD COLUMN IF NOT EXISTS trial_duration_days INTEGER DEFAULT 7;

-- Ensure default values for the global setting row
UPDATE public.superadmin_settings 
SET trial_enabled = TRUE, trial_duration_days = 7 
WHERE id = 'global' 
  AND (trial_enabled IS NULL OR trial_duration_days IS NULL);
