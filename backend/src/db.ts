import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://wnaayghjmewxzwratqas.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseKey) {
  console.warn('Warning: SUPABASE_KEY environment variable is not set. Database queries may fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
