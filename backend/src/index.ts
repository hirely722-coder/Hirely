import { Hono } from 'hono';
import { cors } from 'hono/cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware, requirePermission } from './middleware/auth';
import { runBackgroundQueueWorker, startTelegramBotPolling } from './services/worker';
import { registerEmailIntegrationRoutes } from './email_integration_routes';
import { registerEmailCenterRoutes } from './email_center_routes';

// Import routers
import { aiRouter } from './routes/ai.routes';
import { crudRouter } from './routes/crud.routes';
import { workspaceRouter } from './routes/workspace.routes';
import { paymentRouter } from './routes/payment.routes';
import { superadminRouter } from './routes/superadmin.routes';
import { publicRouter } from './routes/public.routes';

dotenv.config();

const app = new Hono<{
  Variables: {
    user: any;
  }
}>();

export { app };

// Enable CORS for frontend
app.use('/*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Error Handling
app.onError(errorHandler);

// Global Authentication Middleware
app.use('/api/*', authMiddleware);

// Mount sub-routers
app.route('/api/ai', aiRouter);
app.route('/api/superadmin', superadminRouter);
app.route('/api', crudRouter);
app.route('/api', workspaceRouter);
app.route('/api', paymentRouter);
app.route('/api', publicRouter);

// Register Email Integration routes
registerEmailIntegrationRoutes(app, requirePermission);
registerEmailCenterRoutes(app);

// Start Telegram Bot update polling
startTelegramBotPolling();

// Kick off queue runner loop for Bun local dev only
if (typeof (globalThis as any).Bun !== 'undefined') {
  setTimeout(runBackgroundQueueWorker, 3000);
}

// Cloudflare Workers + Bun compatible export
export default {
  port: parseInt(process.env.PORT || '3001'),
  idleTimeout: 60,
  async fetch(req: Request, env: any, ctx?: any) {
    // Fire background email/job queue worker as a non-blocking task
    if (ctx?.waitUntil) {
      ctx.waitUntil(runBackgroundQueueWorker());
    }
    return app.fetch(req, env, ctx);
  }
};
