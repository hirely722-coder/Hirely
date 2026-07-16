import { supabase } from '../db';

// Global in-memory Rate Limiter cache
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(limit: number, timeframeMs: number, apiCategory: string) {
  return async (c: any, next: any) => {
    const user = c.get('user') as any;
    const identifier = user?.workspace_id || c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'global';
    const cacheKey = `${identifier}:${apiCategory}`;
    
    const now = Date.now();
    let record = rateLimitCache.get(cacheKey);
    
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + timeframeMs };
    }
    
    record.count += 1;
    rateLimitCache.set(cacheKey, record);
    
    if (record.count > limit) {
      // Log rate limit violation inside rbac_audit_logs table
      if (user && user.workspace_id) {
        try {
          await supabase.from('rbac_audit_logs').insert([{
            workspace_id: user.workspace_id,
            user_id: user.id,
            action: 'rate_limit_exceeded',
            details: `Rate limit violation on ${apiCategory} API. Requests: ${record.count}/${limit}`
          }]);
        } catch (e) {}
      }
      return c.json({
        error: 'Too Many Requests: Rate limit exceeded. Please slow down and try again later.',
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000)
      }, 429);
    }
    
    await next();
  };
}
