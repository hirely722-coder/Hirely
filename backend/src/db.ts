import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let clientInstance: any = null;

function getClient() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://wnaayghjmewxzwratqas.supabase.co';
  const supabaseKey = process.env.SUPABASE_KEY || '';

  // If a valid key is available on process.env (shimmed at request-time by workerd),
  // cache the initialized client. Otherwise, return a dummy client for build-time safety.
  if (supabaseKey && supabaseKey !== 'dummy-key-for-validation') {
    if (!clientInstance) {
      console.log('[Supabase Client] Initializing client with runtime secret key');
      clientInstance = createClient(supabaseUrl, supabaseKey);
    }
    return clientInstance;
  }

  // Fallback dummy client for global initialization/build phase
  return createClient(supabaseUrl, 'dummy-key-for-validation');
}

export const supabase = new Proxy({} as any, {
  get(target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
