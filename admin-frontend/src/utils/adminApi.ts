import { supabase } from '@/utils/supabase';

export async function fetchAdminApi(path: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/^\uFEFF/, '');
  if (!backendUrl) {
    throw new Error('Missing NEXT_PUBLIC_BACKEND_URL environment variable.');
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
