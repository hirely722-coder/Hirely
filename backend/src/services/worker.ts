import nodemailer from 'nodemailer';
import { supabase } from '../db';

// Autonomous Background Job & Email Queue Worker Loop
export async function runBackgroundQueueWorker() {
  try {
    // 1. Process Background Jobs
    const { data: pendingJobs } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (pendingJobs && pendingJobs.length > 0) {
      for (const job of pendingJobs) {
        await supabase.from('background_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);
        
        try {
          console.log(`[Job Worker] Executing task queue item: ${job.type} for ID: ${job.id}`);
          // Update status upon processing completing
          await supabase.from('background_jobs').update({
            status: 'completed',
            progress: 100,
            result: { success: true },
            updated_at: new Date().toISOString()
          }).eq('id', job.id);
        } catch (jobErr: any) {
          const retries = (job.retry_count || 0) + 1;
          const isFailed = retries >= 3;
          await supabase.from('background_jobs').update({
            status: isFailed ? 'failed' : 'pending',
            retry_count: retries,
            error_message: jobErr.message,
            updated_at: new Date().toISOString()
          }).eq('id', job.id);
        }
      }
    }

    // 2. Process Email Queue
    const { data: pendingEmails } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'queued')
      .limit(5);

    if (pendingEmails && pendingEmails.length > 0) {
      for (const email of pendingEmails) {
        await supabase.from('email_queue').update({ status: 'sending', last_attempt: new Date().toISOString() }).eq('id', email.id);
        
        try {
          console.log(`[Email Queue Worker] Processing queue email to ${email.recipient} - Subject: ${email.subject}`);
          
          // Retrieve custom SMTP config for this workspace
          const { data: configs, error: configErr } = await supabase
            .from('email_configs')
            .select('*')
            .eq('workspace_id', email.workspace_id);
            
          if (configErr) throw configErr;
          
          const config = configs && configs.length > 0 ? configs[0] : null;
          if (!config || !config.is_connected || !config.smtp_host) {
            throw new Error('SMTP configuration not found or not connected for this workspace.');
          }
          
          // Create custom SMTP transporter
          const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: parseInt(config.port),
            secure: config.encryption === 'SSL',
            auth: {
              user: config.username,
              pass: config.password,
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          
          // Dispatch email
          await transporter.sendMail({
            from: `"${config.username.split('@')[0]}" <${config.username}>`,
            to: email.recipient,
            subject: email.subject,
            text: email.body,
            html: email.body
          });

          await supabase.from('email_queue').update({
            status: 'delivered',
            sent_at: new Date().toISOString()
          }).eq('id', email.id);
        } catch (mailErr: any) {
          console.error(`[Email Queue Worker] Send failed for email ${email.id}:`, mailErr.message);
          const retries = (email.retry_count || 0) + 1;
          const isFailed = retries >= 3;
          await supabase.from('email_queue').update({
            status: isFailed ? 'failed' : 'queued',
            retry_count: retries,
            error_message: mailErr.message
          }).eq('id', email.id);
        }
      }
    }
  } catch (e: any) {
    console.error('[Background Queue Worker] Error:', e.message);
  }

  // In Bun/local dev, recurse with setTimeout.
  // In Cloudflare Workers, ctx.waitUntil() handles scheduling (see export default).
  if (typeof (globalThis as any).Bun !== 'undefined') {
    setTimeout(runBackgroundQueueWorker, 5000);
  }
}

export async function sanitizeJobData(data: any, user: any) {
  if (!data) return data;

  // Normalize status to prevent database check constraint violations ('Open', 'Closed')
  if (data.status) {
    const s = data.status.toString().trim().toLowerCase();
    if (s === 'active' || s === 'open') {
      data.status = 'Open';
    } else if (s === 'closed') {
      data.status = 'Closed';
    } else {
      data.status = 'Open';
    }
  } else {
    data.status = 'Open';
  }
  
  // Only sanitize if companyName or companyId are explicitly passed
  if ('companyId' in data || 'companyName' in data) {
    let matchedCompanyId = data.companyId || null;
    let matchedCompanyName = 'None';

    if (matchedCompanyId) {
      const { data: comp } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', matchedCompanyId)
        .eq('workspace_id', user.workspace_id)
        .maybeSingle();
      if (comp) {
        matchedCompanyName = comp.name;
      } else {
        matchedCompanyId = null;
      }
    } else if (data.companyName && data.companyName !== 'None') {
      const { data: comps } = await supabase
        .from('companies')
        .select('id, name')
        .eq('workspace_id', user.workspace_id);
      
      const comp = comps?.find(c => c.name.toLowerCase() === data.companyName.toLowerCase());
      if (comp) {
        matchedCompanyId = comp.id;
        matchedCompanyName = comp.name;
      }
    }

    data.companyId = matchedCompanyId;
    data.companyName = matchedCompanyName;
  }

  return data;
}

export async function startTelegramBotPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('Telegram Bot Token not configured. Polling skipped.');
    return;
  }

  console.log('Starting Telegram Bot update polling...');
  let offset = 0;

  async function poll() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            offset = Math.max(offset, update.update_id + 1);

            const message = update.message;
            if (!message || !message.text) continue;

            const chat = message.chat;
            const text = message.text.trim();

            // Check if message is /start <token>
            if (text.startsWith('/start ')) {
              const verifyToken = text.substring(7).trim();
              if (verifyToken) {
                // Find the config with this telegram_token
                const { data: configs, error } = await supabase
                  .from('email_configs')
                  .select('*')
                  .eq('telegram_token', verifyToken);

                if (!error && configs && configs.length > 0) {
                  const userConfig = configs[0];
                  const userId = userConfig.id; // userConfig.id is user_id

                  // Update database: set chat_id, enable notification, and clear temp token
                  await supabase
                    .from('email_configs')
                    .update({
                      telegram_chat_id: String(chat.id),
                      telegram_notification_enabled: true,
                      telegram_token: null
                    })
                    .eq('id', userId);

                  // Send success message to Telegram user
                  const senderName = message.from?.first_name || 'there';
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chat.id,
                      text: `🎉 Hello ${senderName}!\n\nYour Telegram account has been successfully linked to your Hirly Recruiter profile.\n\nYou will now receive instant alerts here when new resumes are uploaded.`
                    })
                  });

                  console.log(`[TELEGRAM] Successfully connected chat_id ${chat.id} to user_id ${userId}`);
                } else {
                  // Invalid or expired token
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chat.id,
                      text: `❌ Link Failed: The verification link is invalid or expired. Please generate a new connection link in settings.`
                    })
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in Telegram polling loop:', err);
    } finally {
      // Wait 3 seconds after completion before polling again
      setTimeout(poll, 3000);
    }
  }

  // Start polling
  poll();
}

