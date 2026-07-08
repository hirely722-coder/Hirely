import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wnaayghjmewxzwratqas.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYWF5Z2hqbWV3eHp3cmF0cWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTMwNzMsImV4cCI6MjA5ODEyOTA3M30.eWmFKOWB0FZrq-KTxhssHWOv8blpyeB21W_kS4Z9w4g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
