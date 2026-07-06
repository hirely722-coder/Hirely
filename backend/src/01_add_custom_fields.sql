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

-- Create GIN index on candidates custom_fields JSONB column for efficient query filtering
CREATE INDEX IF NOT EXISTS idx_candidates_custom_fields ON public.candidates USING GIN (custom_fields);

-- Create trigger function to clean up candidate records when a custom field is deleted
CREATE OR REPLACE FUNCTION public.on_custom_field_definition_deleted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.candidates
  SET custom_fields = custom_fields - OLD.key
  WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_on_custom_field_definition_deleted ON public.custom_field_definitions;

CREATE TRIGGER trigger_on_custom_field_definition_deleted
AFTER DELETE ON public.custom_field_definitions
FOR EACH ROW
EXECUTE FUNCTION public.on_custom_field_definition_deleted();
