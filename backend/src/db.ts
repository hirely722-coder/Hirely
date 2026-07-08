import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://wnaayghjmewxzwratqas.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'dummy-key-for-validation';

export const supabase = createClient(supabaseUrl, supabaseKey);
