-- Add custom_fields column to candidates
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create custom_field_definitions table
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'candidate',
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- Allow anon access policy
DROP POLICY IF EXISTS "Allow anon access" ON public.custom_field_definitions;
CREATE POLICY "Allow anon access" ON public.custom_field_definitions
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
