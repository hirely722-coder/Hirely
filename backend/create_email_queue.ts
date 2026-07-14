import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const sql = `
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'queued',
  retry_count integer DEFAULT 0,
  error_message text,
  sent_at timestamptz,
  last_attempt timestamptz,
  created_at timestamptz DEFAULT now()
);
`;

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  // Try direct insert approach - table might already exist
  console.log('RPC not available, trying direct check...');
  const { error: testError } = await supabase.from('email_queue').select('id').limit(1);
  if (testError && testError.code === '42P01') {
    console.error('Table does not exist and cannot be created via JS client. Please create it in Supabase dashboard.');
    console.log('\n--- SQL to run in Supabase SQL Editor ---');
    console.log(sql);
  } else if (testError) {
    console.error('Other error:', testError.message);
  } else {
    console.log('✅ email_queue table already exists!');
  }
} else {
  console.log('✅ email_queue table created successfully!');
}
