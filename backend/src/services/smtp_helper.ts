// smtp_helper.ts
// Edge-safe SMTP resolver for both production (Cloudflare Workers) and local dev (Bun/Node).

let MailerImpl: any = null;

export async function getMailerImpl() {
  if (MailerImpl) return MailerImpl;
  try {
    // Try to load worker-mailer (Cloudflare production)
    const { WorkerMailer } = await import('worker-mailer');

    // Apply runtime monkeypatch to parse SMTP capabilities line-by-line, bypassing the buggy regex
    (WorkerMailer.prototype as any).parseCapabilities = function (e: string) {
      const self = this as any;
      if (/[ -]AUTH\b/i.test(e)) {
        self.allowAuth = true;
      }
      if (/[ -]STARTTLS\b/i.test(e)) {
        self.supportsStartTls = true;
      }
      if (/[ -]DSN\b/i.test(e)) {
        self.supportsDSN = true;
      }

      const lines = e.split(/\r?\n/);
      for (const line of lines) {
        if (/[ -]AUTH\b/i.test(line)) {
          if (/\bPLAIN\b/i.test(line)) {
            self.authTypeSupported.push('plain');
          }
          if (/\bLOGIN\b/i.test(line)) {
            self.authTypeSupported.push('login');
          }
          if (/\bCRAM-MD5\b/i.test(line)) {
            self.authTypeSupported.push('cram-md5');
          }
        }
      }
    };

    MailerImpl = {
      type: 'worker-mailer',
      connect: async (options: any) => {
        return await WorkerMailer.connect(options);
      }
    };
    console.log('[SMTP Helper] Successfully loaded and patched edge-native worker-mailer.');
  } catch (err: any) {
    // Fallback to standard nodemailer (Local development)
    console.log('[SMTP Helper] cloudflare:sockets unavailable. Falling back to local nodemailer client. Error:', err.message);
    const nodemailer = await import('nodemailer');
    MailerImpl = {
      type: 'nodemailer',
      connect: async (options: any) => {
        const transporter = nodemailer.createTransport({
          host: options.host,
          port: options.port,
          secure: options.secure,
          auth: options.credentials ? {
            user: options.credentials.username,
            pass: options.credentials.password
          } : undefined,
          tls: {
            rejectUnauthorized: false
          }
        });
        return {
          send: async (emailOptions: any) => {
            const fromStr = typeof emailOptions.from === 'string' 
              ? emailOptions.from 
              : `"${emailOptions.from.name || ''}" <${emailOptions.from.email}>`;
            
            const toStr = typeof emailOptions.to === 'string'
              ? emailOptions.to
              : Array.isArray(emailOptions.to)
                ? emailOptions.to.map((u: any) => typeof u === 'string' ? u : u.email).join(', ')
                : emailOptions.to.email;

            await transporter.sendMail({
              from: fromStr,
              to: toStr,
              subject: emailOptions.subject,
              text: emailOptions.text,
              html: emailOptions.html,
              attachments: emailOptions.attachments?.map((att: any) => ({
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'),
                contentType: att.mimeType
              }))
            });
          },
          close: async () => {}
        };
      }
    };
  }
  return MailerImpl;
}
