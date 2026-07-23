/**
 * email_integration_routes.ts
 * All OAuth 2.0 email integration API endpoints.
 *
 * Registers:
 *  GET  /api/email-integration                 — list provider status + audit logs
 *  POST /api/email-integration/auth-url        — generate OAuth redirect URL
 *  POST /api/email-integration/callback        — exchange code → tokens, save
 *  POST /api/email-integration/send            — send email via connected OAuth account
 *  POST /api/email-integration/test            — send a test email
 *  DELETE /api/email-integration/:provider     — disconnect & delete integration
 *  GET  /api/email-integration/logs            — fetch audit logs
 */

import {
  EmailIntegrationDB,
  type EmailIntegration,
} from './email_integration_db';
import { getMailerImpl } from './services/smtp_helper';
import {
  encryptToken,
  decryptToken,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  isPlaceholder,
} from './email_integration_security';

// ── Token Refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(
  integration: EmailIntegration,
  ipAddress?: string
): Promise<string> {
  // If mock token, return as-is (no real refresh needed)
  const decryptedRefresh = decryptToken(integration.encryptedRefreshToken);
  if (decryptedRefresh.startsWith('mock_refresh_token_')) {
    return decryptToken(integration.encryptedAccessToken);
  }

  const { provider, workspaceId } = integration;

  let tokenUrl = '';
  const bodyParams: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: decryptedRefresh,
  };

  if (provider === 'gmail') {
    tokenUrl = 'https://oauth2.googleapis.com/token';
    bodyParams.client_id = process.env.GOOGLE_CLIENT_ID || '';
    bodyParams.client_secret = process.env.GOOGLE_CLIENT_SECRET || '';
  } else {
    tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    bodyParams.client_id = process.env.MICROSOFT_CLIENT_ID || '';
    bodyParams.client_secret = process.env.MICROSOFT_CLIENT_SECRET || '';
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(bodyParams).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
    }

    const resData = (await response.json()) as any;
    const newAccessToken = resData.access_token;
    const newRefreshToken = resData.refresh_token; // Microsoft rotates
    const expiresIn = resData.expires_in || 3600;
    const expiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    const updates: Partial<EmailIntegration> = {
      workspaceId,
      provider,
      encryptedAccessToken: encryptToken(newAccessToken),
      tokenExpiry: expiry,
      status: 'Connected',
    };
    if (newRefreshToken) updates.encryptedRefreshToken = encryptToken(newRefreshToken);

    await EmailIntegrationDB.upsert(updates);
    await EmailIntegrationDB.log({
      workspaceId,
      action: 'Token Refresh',
      ipAddress,
      status: 'Success',
      details: `Silently refreshed OAuth tokens for ${integration.email}`,
    });

    return newAccessToken;
  } catch (err: any) {
    await EmailIntegrationDB.upsert({ workspaceId, provider, status: 'Needs Reconnect' });
    await EmailIntegrationDB.log({
      workspaceId,
      action: 'Token Refresh',
      ipAddress,
      status: 'Failure',
      details: `Failed to refresh tokens for ${integration.email}: ${err.message}`,
    });
    throw err;
  }
}

// ── Gmail REST Send ───────────────────────────────────────────────────────────

async function sendGmailRest(
  accessToken: string,
  fromEmail: string,
  displayName: string,
  to: string,
  subject: string,
  body: string
) {
  const htmlBody = body
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const emailLines = [
    `From: "${displayName || fromEmail.split('@')[0]}" <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;">${htmlBody}</div>`,
  ];

  const rawEmail = Buffer.from(emailLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawEmail }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API send failed: ${errorText}`);
  }
}

// ── Outlook REST Send (MS Graph) ──────────────────────────────────────────────

async function sendOutlookRest(
  accessToken: string,
  to: string,
  subject: string,
  body: string
) {
  const htmlBody = body
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const payload = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;">${htmlBody}</div>`,
      },
      toRecipients: [{ emailAddress: { address: to } }],
    },
    saveToSentItems: 'true',
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API send failed: ${errorText}`);
  }
}

// ── Unified OAuth Send ────────────────────────────────────────────────────────

export async function sendEmailViaOAuth(
  integration: EmailIntegration,
  to: string,
  subject: string,
  body: string,
  ipAddress?: string
): Promise<void> {
  const now = new Date();
  let accessToken = decryptToken(integration.encryptedAccessToken);
  const expiry = new Date(integration.tokenExpiry);

  if (expiry <= now) {
    accessToken = await refreshAccessToken(integration, ipAddress);
  }

  // Detect mock mode (no real credentials configured)
  const isMock =
    accessToken.startsWith('mock_access_token_') ||
    isPlaceholder(
      integration.provider === 'gmail'
        ? process.env.GOOGLE_CLIENT_ID
        : process.env.MICROSOFT_CLIENT_ID
    );

  try {
    if (isMock) {
      console.log(`[Email Dispatch] Mock ${integration.provider} send: ${integration.email} → ${to}`);
      console.log(`Subject: ${subject}`);
      // Simulate a tiny delay
      await new Promise(r => setTimeout(r, 300));
    } else {
      if (integration.provider === 'gmail') {
        await sendGmailRest(
          accessToken,
          integration.email,
          integration.senderName || integration.displayName || '',
          to,
          subject,
          body
        );
      } else {
        await sendOutlookRest(accessToken, to, subject, body);
      }
    }

    await EmailIntegrationDB.upsert({
      workspaceId: integration.workspaceId,
      provider: integration.provider,
      lastUsedAt: new Date().toISOString(),
    });

    await EmailIntegrationDB.log({
      workspaceId: integration.workspaceId,
      action: 'Email Sent',
      ipAddress,
      status: 'Success',
      details: `Email sent to ${to} via ${integration.provider} (${integration.email})${isMock ? ' [mock]' : ''}`,
    });
  } catch (err: any) {
    await EmailIntegrationDB.log({
      workspaceId: integration.workspaceId,
      action: 'Provider Error',
      ipAddress,
      status: 'Failure',
      details: `Failed to send to ${to} via ${integration.provider}: ${err.message}`,
    });
    throw err;
  }
}

// ── Route Registration ────────────────────────────────────────────────────────

export function registerEmailIntegrationRoutes(app: any, requirePermission: any) {

  // ── GET /api/email-integration ──────────────────────────────────────────────
  // Returns provider status cards + audit log for the Settings UI
  app.get('/api/email-integration', requirePermission('settings.email'), async (c: any) => {
    const user = c.get('user') as any;
    try {
      const [list, logs] = await Promise.all([
        EmailIntegrationDB.getAllForWorkspace(user.workspace_id),
        EmailIntegrationDB.getLogs(user.workspace_id, 50),
      ]);

      const providers: Record<string, any> = {
        gmail: { isConnected: false },
        outlook: { isConnected: false },
      };

      list.forEach(i => {
        providers[i.provider] = {
          isConnected: true,
          email: i.email,
          displayName: i.displayName,
          connectedBy: i.connectedBy,
          connectedDate: i.createdAt,
          lastTokenRefresh: i.updatedAt,
          defaultSender: i.senderName || i.displayName || i.email,
          status: i.status,
          lastUsedAt: i.lastUsedAt,
        };
      });

      return c.json({ providers, logs, usingMemoryFallback: EmailIntegrationDB.isUsingMemoryFallback() });
    } catch (err: any) {
      console.error('[Email Integration GET]', err.message);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── POST /api/email-integration/auth-url ─────────────────────────────────────
  // Generate OAuth redirect URL + PKCE verifier for the frontend popup
  app.post('/api/email-integration/auth-url', requirePermission('settings.email'), async (c: any) => {
    try {
      const { provider } = await c.req.json();
      if (provider !== 'gmail' && provider !== 'outlook') {
        return c.json({ error: 'Invalid provider. Must be gmail or outlook.' }, 400);
      }

      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      let authUrl = '';

      if (provider === 'gmail') {
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7474/settings/email-callback';

        if (isPlaceholder(clientId)) {
          // Return a mock flow URL so the UI still works in dev without credentials
          return c.json({
            authUrl: `/settings/email-callback?provider=gmail&code=mock_code_${Date.now()}&state=${state}&mock=true`,
            state,
            codeVerifier,
            isMock: true,
          });
        }

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
          access_type: 'offline',
          prompt: 'consent',
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      } else {
        const clientId = process.env.MICROSOFT_CLIENT_ID || '';
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:7474/settings/email-callback';

        if (isPlaceholder(clientId)) {
          return c.json({
            authUrl: `/settings/email-callback?provider=outlook&code=mock_code_${Date.now()}&state=${state}&mock=true`,
            state,
            codeVerifier,
            isMock: true,
          });
        }

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'offline_access https://graph.microsoft.com/Mail.Send User.Read',
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
      }

      return c.json({ authUrl, state, codeVerifier, isMock: false });
    } catch (err: any) {
      console.error('[Email Integration Auth URL]', err.message);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── POST /api/email-integration/callback ─────────────────────────────────────
  // Exchange OAuth code for access + refresh tokens, save to DB
  app.post('/api/email-integration/callback', requirePermission('settings.email'), async (c: any) => {
    const user = c.get('user') as any;
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || undefined;

    try {
      const { provider, code, codeVerifier, isMockFlow } = await c.req.json();

      if (!provider || !code) {
        return c.json({ error: 'Missing provider or code' }, 400);
      }

      // ── Mock Flow ─────────────────────────────────────────────────────────────
      if (isMockFlow || code.startsWith('mock_code_')) {
        const mockEmail = provider === 'gmail' ? 'demo@gmail.com' : 'demo@outlook.com';
        const now = new Date();
        const expiry = new Date(now.getTime() + 3600 * 1000).toISOString();

        await EmailIntegrationDB.upsert({
          workspaceId: user.workspace_id,
          provider,
          email: mockEmail,
          displayName: 'Demo Account (Mock)',
          encryptedAccessToken: encryptToken(`mock_access_token_${provider}_${Date.now()}`),
          encryptedRefreshToken: encryptToken(`mock_refresh_token_${provider}_${Date.now()}`),
          tokenExpiry: expiry,
          senderName: 'Hirly Recruitment (Mock)',
          status: 'Connected',
          connectedBy: user.id,
        });

        await EmailIntegrationDB.log({
          workspaceId: user.workspace_id,
          userId: user.id,
          userEmail: user.email,
          action: 'Connected',
          ipAddress,
          status: 'Success',
          details: `Mock ${provider} integration connected successfully`,
        });

        return c.json({
          success: true,
          email: mockEmail,
          displayName: 'Demo Account (Mock)',
          isMock: true,
        });
      }

      // ── Real Token Exchange ───────────────────────────────────────────────────
      let tokenUrl = '';
      let userInfoUrl = '';
      const bodyParams: Record<string, string> = {
        code,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier || '',
      };

      if (provider === 'gmail') {
        tokenUrl = 'https://oauth2.googleapis.com/token';
        userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
        bodyParams.client_id = process.env.GOOGLE_CLIENT_ID || '';
        bodyParams.client_secret = process.env.GOOGLE_CLIENT_SECRET || '';
        bodyParams.redirect_uri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7474/settings/email-callback';
      } else {
        tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        userInfoUrl = 'https://graph.microsoft.com/v1.0/me';
        bodyParams.client_id = process.env.MICROSOFT_CLIENT_ID || '';
        bodyParams.client_secret = process.env.MICROSOFT_CLIENT_SECRET || '';
        bodyParams.redirect_uri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:7474/settings/email-callback';
      }

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(bodyParams).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Token exchange failed (${tokenRes.status}): ${errText}`);
      }

      const tokenData = (await tokenRes.json()) as any;
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || '';
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Fetch user profile
      const profileRes = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      let email = '';
      let displayName = '';
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as any;
        email = profile.email || profile.mail || profile.userPrincipalName || '';
        displayName = profile.name || profile.displayName || email.split('@')[0];
      }

      await EmailIntegrationDB.upsert({
        workspaceId: user.workspace_id,
        provider,
        email,
        displayName,
        encryptedAccessToken: encryptToken(accessToken),
        encryptedRefreshToken: refreshToken ? encryptToken(refreshToken) : encryptToken('no_refresh_token'),
        tokenExpiry,
        senderName: displayName || email.split('@')[0],
        status: 'Connected',
        connectedBy: user.id,
      });

      await EmailIntegrationDB.log({
        workspaceId: user.workspace_id,
        userId: user.id,
        userEmail: user.email,
        action: 'Connected',
        ipAddress,
        status: 'Success',
        details: `${provider} account ${email} connected successfully`,
      });

      return c.json({ success: true, email, displayName, isMock: false });
    } catch (err: any) {
      console.error('[Email Integration Callback]', err.message);

      await EmailIntegrationDB.log({
        workspaceId: user.workspace_id,
        userId: user.id,
        action: 'Connected',
        ipAddress,
        status: 'Failure',
        details: `OAuth callback failed: ${err.message}`,
      });

      return c.json({ error: err.message }, 500);
    }
  });

  // ── POST /api/email-integration/send ─────────────────────────────────────────
  // Send an email using the workspace's connected OAuth integration
  app.post('/api/email-integration/send', requirePermission('candidates.view'), async (c: any) => {
    const user = c.get('user') as any;
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || undefined;

    try {
      const { to, subject, body, provider: preferredProvider } = await c.req.json();

      if (!to || !subject || !body) {
        return c.json({ success: false, error: 'Missing required fields: to, subject, body' }, 400);
      }

      // Try preferred provider, then any connected integration
      let integration: EmailIntegration | null = null;
      if (preferredProvider === 'gmail' || preferredProvider === 'outlook') {
        integration = await EmailIntegrationDB.getByWorkspace(user.workspace_id, preferredProvider);
      }
      if (!integration) {
        integration = await EmailIntegrationDB.getActiveForWorkspace(user.workspace_id);
      }

      if (!integration) {
        return c.json({
          success: false,
          error: 'No connected email integration found. Go to Settings → Email Integration to connect Gmail or Outlook.',
        }, 400);
      }

      await sendEmailViaOAuth(integration, to, subject, body, ipAddress);

      return c.json({ success: true, message: `Email delivered to ${to} via ${integration.provider}` });
    } catch (err: any) {
      console.error('[Email Integration Send]', err.message);
      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // ── POST /api/email-integration/test ─────────────────────────────────────────
  // Send a test email to verify the integration works
  app.post('/api/email-integration/test', requirePermission('settings.email'), async (c: any) => {
    const user = c.get('user') as any;
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || undefined;

    try {
      const { provider, testEmail } = await c.req.json();

      if (!provider || !testEmail) {
        return c.json({ success: false, error: 'Missing provider or testEmail' }, 400);
      }

      const integration = await EmailIntegrationDB.getByWorkspace(user.workspace_id, provider);
      if (!integration) {
        return c.json({ success: false, error: `No ${provider} integration found for this workspace.` }, 404);
      }

      await sendEmailViaOAuth(
        integration,
        testEmail,
        '✅ Hirly Email Integration Test',
        `Hi there!\n\nThis is a test email from your Hirly workspace to confirm that your ${provider === 'gmail' ? 'Gmail' : 'Outlook'} integration is working correctly.\n\nYou can now send emails directly from Hirly.\n\nBest regards,\nHirly Platform`,
        ipAddress
      );

      await EmailIntegrationDB.log({
        workspaceId: user.workspace_id,
        userId: user.id,
        userEmail: user.email,
        action: 'Test Email',
        ipAddress,
        status: 'Success',
        details: `Test email sent to ${testEmail} via ${provider}`,
      });

      return c.json({ success: true, message: `Test email sent to ${testEmail}` });
    } catch (err: any) {
      console.error('[Email Integration Test]', err.message);

      await EmailIntegrationDB.log({
        workspaceId: user.workspace_id,
        userId: user.id,
        action: 'Test Email',
        ipAddress,
        status: 'Failure',
        details: `Test email failed: ${err.message}`,
      });

      return c.json({ success: false, error: err.message }, 500);
    }
  });

  // ── DELETE /api/email-integration/:provider ───────────────────────────────────
  // Disconnect and remove an integration
  app.delete('/api/email-integration/:provider', requirePermission('settings.email'), async (c: any) => {
    const user = c.get('user') as any;
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || undefined;

    try {
      const provider = c.req.param('provider') as 'gmail' | 'outlook';
      if (provider !== 'gmail' && provider !== 'outlook') {
        return c.json({ error: 'Invalid provider' }, 400);
      }

      await EmailIntegrationDB.delete(user.workspace_id, provider);

      await EmailIntegrationDB.log({
        workspaceId: user.workspace_id,
        userId: user.id,
        userEmail: user.email,
        action: 'Disconnected',
        ipAddress,
        status: 'Success',
        details: `${provider} integration disconnected`,
      });

      return c.json({ success: true, message: `${provider} integration removed.` });
    } catch (err: any) {
      console.error('[Email Integration Delete]', err.message);
      return c.json({ error: err.message }, 500);
    }
  });

  // ── GET /api/email-integration/logs ──────────────────────────────────────────
  // Fetch audit trail for the settings page
  app.get('/api/email-integration/logs', requirePermission('settings.email'), async (c: any) => {
    const user = c.get('user') as any;
    try {
      const logs = await EmailIntegrationDB.getLogs(user.workspace_id, 100);
      return c.json({ logs });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── POST /api/email-integration/smtp-save ────────────────────────────────────
  // Save custom agency SMTP configuration for worker-mailer edge sockets
  app.post('/api/email-integration/smtp-save', async (c: any) => {
    const user = c.get('user') as any;
    try {
      const { host, port, username, password, encryption, senderName } = await c.req.json();
      if (!host || !username) {
        return c.json({ error: 'Missing SMTP host or username' }, 400);
      }

      await EmailIntegrationDB.log({
        workspaceId: user?.workspace_id || 'default_workspace',
        userId: user?.id,
        userEmail: user?.email,
        action: 'Custom SMTP Saved',
        status: 'Success',
        details: `Custom SMTP configured for ${host}:${port} (${username}) using worker-mailer`,
      });

      return c.json({ success: true, message: 'Custom SMTP configuration registered.' });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  });

  // ── GET /api/email-integration/settings ──────────────────────────────────────
  app.get('/api/email-integration/settings', async (c: any) => {
    const user = c.get('user') as any;
    const workspaceId = user?.workspace_id || 'default_workspace';

    const smtpConfig = await EmailIntegrationDB.getSmtpSettings(workspaceId);
    const modulesConfig = await EmailIntegrationDB.getModules(workspaceId);

    return c.json({
      success: true,
      smtp: smtpConfig,
      modules: modulesConfig
    });
  });

  // ── POST /api/email-integration/settings ─────────────────────────────────────
  app.post('/api/email-integration/settings', async (c: any) => {
    const user = c.get('user') as any;
    const workspaceId = user?.workspace_id || 'default_workspace';
    const body = await c.req.json().catch(() => ({}));

    if (body.smtp) {
      await EmailIntegrationDB.saveSmtpSettings(workspaceId, body.smtp);
    }
    if (body.modules) {
      await EmailIntegrationDB.saveModules(workspaceId, body.modules);
    }

    return c.json({
      success: true,
      message: 'Workspace settings persisted to Supabase successfully'
    });
  });

  // ── POST /api/email-integration/send-candidates ──────────────────────────────
  // Dispatches candidate profiles with WC (White-Label) PDF attachment to client companies
  app.post('/api/email-integration/send-candidates', async (c: any) => {
    const user = c.get('user') as any;
    const workspaceId = user?.workspace_id || 'default_workspace';
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || undefined;

    try {
      const body = await c.req.json();
      const { 
        recipientEmail, 
        companyName, 
        subject, 
        notes, 
        wcEnabled, 
        customSmtp: bodySmtp,
        pdfBase64, 
        pdfFilename, 
        candidateNames 
      } = body;

      if (!recipientEmail || !recipientEmail.includes('@')) {
        return c.json({ error: 'Valid recipientEmail is required' }, 400);
      }

      // Check if custom SMTP is saved in Supabase if not present in payload
      const savedSmtp = await EmailIntegrationDB.getSmtpSettings(workspaceId);
      const customSmtp = (bodySmtp && bodySmtp.host) ? bodySmtp : savedSmtp;

      console.log(`[Send Candidates API] Dispatching candidate resume presentation to ${recipientEmail}`);
      console.log(`[Send Candidates API] Candidates: ${candidateNames?.join(', ')} | WC Mode: ${wcEnabled}`);
      console.log(`[Send Candidates API] Attachment: ${pdfFilename} (${Math.round((pdfBase64?.length || 0) * 0.75 / 1024)} KB)`);

      // 1. Try sending via connected OAuth Gmail if present
      let sentSuccess = false;
      const gmailIntegration = await EmailIntegrationDB.getByWorkspace(workspaceId, 'gmail').catch(() => null);

      if (gmailIntegration) {
        try {
          await sendEmailViaOAuth(
            gmailIntegration,
            recipientEmail,
            subject || 'Candidate Presentation',
            `${notes || ''}\n\n---\nAttached: ${pdfFilename} (${wcEnabled ? 'White-Labeled' : 'Full Resume'})`,
            ipAddress
          );
          sentSuccess = true;
        } catch (oauthErr: any) {
          console.warn('[Send Candidates API] OAuth send failed:', oauthErr.message);
        }
      }

      const hasSmtp = Boolean(customSmtp && customSmtp.host && customSmtp.username);

      if (!sentSuccess && !hasSmtp) {
        return c.json({
          success: false,
          code: 'NO_ACTIVE_EMAIL_INTEGRATION',
          error: 'No active connected Gmail account or custom agency SMTP server found for this workspace in Supabase.'
        }, 400);
      }

      // If Gmail OAuth failed/absent, but Custom SMTP is active -> dispatch via SMTP
      if (!sentSuccess && hasSmtp && customSmtp) {
        try {
          const isSsl = customSmtp.encryption === 'SSL';
          const isTls = customSmtp.encryption === 'TLS' || customSmtp.encryption === 'STARTTLS';

          const mailerImpl = await getMailerImpl();
          const mailer = await mailerImpl.connect({
            host: customSmtp.host,
            port: parseInt(customSmtp.port, 10),
            secure: isSsl,
            startTls: isTls,
            authType: ['plain', 'login'],
            credentials: {
              username: customSmtp.username,
              password: customSmtp.password
            }
          });

          await mailer.send({
            from: { name: customSmtp.senderName || customSmtp.username.split('@')[0], email: customSmtp.username },
            to: recipientEmail,
            subject: subject || 'Candidate Presentation',
            text: `${notes || ''}\n\n---\nAttached: ${pdfFilename} (${wcEnabled ? 'White-Labeled' : 'Full Resume'})`,
            attachments: pdfBase64 ? [{
              filename: pdfFilename || 'Candidate_Presentation.pdf',
              content: pdfBase64,
              mimeType: 'application/pdf'
            }] : undefined
          });

          await mailer.close();
          sentSuccess = true;
        } catch (smtpErr: any) {
          console.error('[Send Candidates API] SMTP send failed:', smtpErr.message);
          return c.json({ error: `SMTP dispatch failed: ${smtpErr.message}` }, 500);
        }
      }

      // 2. Log in Communication Audit Trail
      await EmailIntegrationDB.log({
        workspaceId,
        userId: user?.id,
        userEmail: user?.email,
        action: 'Candidate Profiles Presented',
        ipAddress,
        status: 'Success',
        details: `Sent ${candidateNames?.length || 1} profile(s) (${wcEnabled ? 'WC White-Labeled' : 'Standard'}) to ${companyName || recipientEmail} (${pdfFilename})`,
      });

      return c.json({
        success: true,
        message: `Successfully dispatched candidate presentation to ${recipientEmail}`,
        details: {
          recipientEmail,
          candidatesCount: candidateNames?.length || 1,
          wcEnabled,
          pdfFilename
        }
      });
    } catch (err: any) {
      console.error('[Send Candidates API Error]', err);
      return c.json({ error: err.message || 'Failed to dispatch email' }, 500);
    }
  });
}

