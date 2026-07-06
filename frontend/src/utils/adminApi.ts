import { supabase } from './supabase';

export async function fetchAdminApi(path: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
