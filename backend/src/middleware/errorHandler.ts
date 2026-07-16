import { supabase } from '../db';

// Global Exception Handler & Realtime Error Logger
export const errorHandler = async (err: Error, c: any) => {
  console.error('[Global Error Logger]:', err.message, err.stack);
  
  const user = c.get('user') as any;
  const userAgent = c.req.header('User-Agent') || 'unknown';
  
  // Extract browser and device from User-Agent header
  let browser = 'Other';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  let device = 'Desktop';
  if (userAgent.includes('Mobi') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    device = 'Mobile';
  }

  try {
    await supabase.from('error_logs').insert([{
      message: err.message || 'Unhandled Exception',
      stack_trace: err.stack || '',
      user_id: user?.id || null,
      workspace_id: user?.workspace_id || null,
      browser,
      device,
      route: c.req.path,
      request_id: c.req.header('X-Request-ID') || `req_${Math.random().toString(36).substring(2, 10)}`,
      category: c.req.path.startsWith('/api/ai') ? 'ai' : c.req.path.startsWith('/api/payments') ? 'payment' : 'api'
    }]);
  } catch (dbErr: any) {
    console.error('[Global Error Logger] Failed to save error log to DB:', dbErr.message);
  }

  return c.json({
    error: 'An unexpected system error occurred. Platform administrators have been notified.',
    details: err.message
  }, 500);
};
