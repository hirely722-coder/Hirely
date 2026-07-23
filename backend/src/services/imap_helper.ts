/**
 * imap_helper.ts
 * Edge-native IMAP Connection Helper for Cloudflare Workers Free Tier & Bun local dev.
 * Uses cloudflare:sockets (port 993) on edge isolates, with fallback to Node/Bun tls sockets.
 */

export interface ImapConnectOptions {
  host: string;
  port: number;
  secure?: boolean;
  username: string;
  password: string;
  mailbox?: string;
  timeoutMs?: number;
}

export interface ImapTestResult {
  success: boolean;
  message: string;
  logs: string[];
}

export class EdgeImapClient {
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private timeoutMs: number;
  private reader: any = null;
  private writer: any = null;
  private tlsSocket: any = null;
  private isEdgeSocket = false;
  private buffer = '';
  private tagCounter = 1;
  public totalMessages = 0;

  constructor(options: ImapConnectOptions) {
    this.host = options.host;
    this.port = options.port || 993;
    this.username = options.username;
    this.password = options.password;
    this.timeoutMs = options.timeoutMs || 15000;
  }

  private nextTag(): string {
    return `A${String(this.tagCounter++).padStart(4, '0')}`;
  }

  /**
   * Connect to IMAP server over TLS/SSL (port 993)
   */
  async connect(logs?: string[]): Promise<void> {
    logs?.push(`[IMAP Helper] Connecting to ${this.host}:${this.port} via TLS/SSL...`);

    try {
      // 1. Try Cloudflare Workers Edge Socket API
      const sockets = await import('cloudflare:sockets' as any);
      const socket = sockets.connect(
        { hostname: this.host, port: this.port },
        { secureTransport: 'on', allowHalfOpen: false }
      );

      this.reader = socket.readable.getReader();
      this.writer = socket.writable.getWriter();
      this.isEdgeSocket = true;
      logs?.push('[IMAP Helper] Connected using cloudflare:sockets edge transport.');
    } catch (err: any) {
      // 2. Fallback to Node.js / Bun TLS socket module for local dev
      logs?.push(`[IMAP Helper] cloudflare:sockets unavailable (${err.message}). Using local TLS socket...`);
      const tls = await import('tls');
      
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Connection to ${this.host}:${this.port} timed out after ${this.timeoutMs}ms.`));
        }, this.timeoutMs);

        this.tlsSocket = tls.connect({
          host: this.host,
          port: this.port,
          rejectUnauthorized: false
        }, () => {
          clearTimeout(timer);
          try { this.tlsSocket.setMaxListeners(100); } catch (e) {}
          logs?.push('[IMAP Helper] Connected using local TLS socket.');
          resolve();
        });

        this.tlsSocket.on('error', (socketErr: any) => {
          clearTimeout(timer);
          reject(socketErr);
        });
      });
    }

    // Read initial IMAP server greeting (* OK ...)
    const greeting = await this.readLine();
    logs?.push(`[IMAP Helper] Server Greeting: ${greeting.trim()}`);
    if (!greeting.startsWith('* OK') && !greeting.startsWith('* PREAUTH')) {
      throw new Error(`Invalid IMAP server greeting: ${greeting.trim()}`);
    }
  }

  /**
   * Read raw response line from socket
   */
  private async readLine(): Promise<string> {
    const startTime = Date.now();

    while (!this.buffer.includes('\r\n')) {
      if (Date.now() - startTime > this.timeoutMs) {
        throw new Error(`IMAP read response timed out after ${this.timeoutMs}ms.`);
      }

      if (this.isEdgeSocket) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += new TextDecoder().decode(value);
      } else if (this.tlsSocket) {
        const chunk = await new Promise<Buffer | null>((resolve) => {
          this.tlsSocket.once('data', (data: Buffer) => resolve(data));
          this.tlsSocket.once('end', () => resolve(null));
        });
        if (!chunk) break;
        this.buffer += chunk.toString('utf-8');
      }
    }

    const newlineIdx = this.buffer.indexOf('\r\n');
    if (newlineIdx !== -1) {
      const line = this.buffer.substring(0, newlineIdx + 2);
      this.buffer = this.buffer.substring(newlineIdx + 2);
      return line;
    }

    const line = this.buffer;
    this.buffer = '';
    return line;
  }

  /**
   * Write line to IMAP socket
   */
  private async writeLine(str: string): Promise<void> {
    const data = str.endsWith('\r\n') ? str : `${str}\r\n`;
    if (this.isEdgeSocket) {
      const encoder = new TextEncoder();
      await this.writer.write(encoder.encode(data));
    } else if (this.tlsSocket) {
      await new Promise<void>((resolve, reject) => {
        this.tlsSocket.write(data, 'utf-8', (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  /**
   * Send tagged IMAP command and await OK/NO/BAD status tag
   */
  async executeCommand(command: string, logs?: string[]): Promise<string[]> {
    const tag = this.nextTag();
    const fullCmd = `${tag} ${command}`;
    
    // Mask password in debug logs
    const safeCmd = command.startsWith('LOGIN') ? `LOGIN "${this.username}" "********"` : command;
    logs?.push(`[IMAP Client] -> ${tag} ${safeCmd}`);

    await this.writeLine(fullCmd);

    const responseLines: string[] = [];
    while (true) {
      const line = await this.readLine();
      if (!line) break;
      
      const trimmed = line.trim();
      responseLines.push(trimmed);

      if (trimmed.startsWith(`${tag} OK`)) {
        logs?.push(`[IMAP Client] <- ${trimmed}`);
        return responseLines;
      }
      
      if (trimmed.startsWith(`${tag} NO`) || trimmed.startsWith(`${tag} BAD`)) {
        logs?.push(`[IMAP Client] <- ${trimmed}`);
        throw new Error(`IMAP Command Failed (${safeCmd}): ${trimmed}`);
      }
    }

    return responseLines;
  }

  /**
   * Authenticate using IMAP LOGIN command
   */
  async login(logs?: string[]): Promise<void> {
    const safeUser = this.username.replace(/"/g, '\\"');
    const safePass = this.password.replace(/"/g, '\\"');
    await this.executeCommand(`LOGIN "${safeUser}" "${safePass}"`, logs);
    logs?.push('[IMAP Helper] Authentication successful.');
  }

  /**
   * Select a mailbox (default: INBOX) and parse total message count
   */
  async selectMailbox(mailbox = 'INBOX', logs?: string[]): Promise<number> {
    const lines = await this.executeCommand(`SELECT "${mailbox}"`, logs);
    for (const l of lines) {
      const match = l.match(/\*\s+(\d+)\s+EXISTS/i);
      if (match) {
        this.totalMessages = parseInt(match[1], 10);
      }
    }
    logs?.push(`[IMAP Helper] Mailbox "${mailbox}" selected successfully. Total messages: ${this.totalMessages}`);
    return this.totalMessages;
  }

  private decodeMimeHeader(headerStr: string): string {
    if (!headerStr) return '';
    try {
      return headerStr.replace(/=\?([^?]+)\?([QBqb])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
        if (encoding.toUpperCase() === 'Q') {
          return text.replace(/=([0-9A-F]{2})/gi, (__: any, hex: string) => String.fromCharCode(parseInt(hex, 16))).replace(/_/g, ' ');
        } else if (encoding.toUpperCase() === 'B') {
          try { return Buffer.from(text, 'base64').toString('utf-8'); } catch (e) { return text; }
        }
        return text;
      });
    } catch (e) {
      return headerStr;
    }
  }

  /**
   * Fetch raw emails from latest to oldest over IMAP socket with date horizon & delta UID support
   */
  async fetchMessages(
    options?: string | { limit?: number; horizonWindow?: string; lastKnownUid?: number; customRange?: string }, 
    logs?: string[]
  ): Promise<any[]> {
    try {
      let customRange = typeof options === 'string' ? options : options?.customRange;
      const limit = typeof options === 'object' && options?.limit ? options.limit : 25;
      const lastKnownUid = typeof options === 'object' ? options?.lastKnownUid : undefined;
      const horizonWindow = typeof options === 'object' ? options?.horizonWindow : undefined;

      let range = customRange;

      if (!range) {
        if (lastKnownUid && lastKnownUid > 0) {
          // Stage 2: High-water mark UID delta fetch
          range = `UID ${lastKnownUid + 1}:*`;
        } else if (horizonWindow && horizonWindow !== 'all') {
          // Stage 1: Time horizon date calculation
          const now = new Date();
          let days = 7;
          if (horizonWindow === '1d') days = 1;
          else if (horizonWindow === '1w') days = 7;
          else if (horizonWindow === '1m') days = 30;
          else if (horizonWindow === '1y') days = 365;

          const sinceDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const dateStr = `${sinceDate.getDate()}-${monthNames[sinceDate.getMonth()]}-${sinceDate.getFullYear()}`;
          
          try {
            logs?.push(`[IMAP Helper] Searching messages SINCE ${dateStr}...`);
            const searchLines = await this.executeCommand(`SEARCH SINCE ${dateStr}`, logs);
            let uids: number[] = [];
            for (const l of searchLines) {
              if (l.startsWith('* SEARCH')) {
                const parts = l.split(/\s+/).slice(2);
                uids = parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
              }
            }
            if (uids.length > 0) {
              const startIdx = Math.max(0, uids.length - limit);
              const selectedUids = uids.slice(startIdx);
              range = `${selectedUids[0]}:${selectedUids[selectedUids.length - 1]}`;
            }
          } catch (searchErr) {
            logs?.push(`[IMAP Search Warning] Fallback to sequence limit: ${(searchErr as any).message}`);
          }
        }

        if (!range) {
          if (this.totalMessages > 0) {
            const start = Math.max(1, this.totalMessages - (limit - 1));
            range = `${start}:${this.totalMessages}`;
          } else {
            range = `1:${limit}`;
          }
        }
      }

      const rawLines = await this.executeCommand(`FETCH ${range} (BODY.PEEK[HEADER.FIELDS (SUBJECT FROM TO DATE MESSAGE-ID)])`, logs);
      const messages: any[] = [];
      let currentSubject = '';
      let currentFrom = '';
      let currentDate = '';
      let currentMsgId = '';

      for (const line of rawLines) {
        if (line.toLowerCase().startsWith('subject:')) {
          currentSubject = this.decodeMimeHeader(line.substring(8).trim());
        } else if (line.toLowerCase().startsWith('from:')) {
          currentFrom = this.decodeMimeHeader(line.substring(5).trim());
        } else if (line.toLowerCase().startsWith('date:')) {
          currentDate = line.substring(5).trim();
        } else if (line.toLowerCase().startsWith('message-id:')) {
          currentMsgId = line.substring(11).trim();
        } else if (line.includes('FETCH') && (currentSubject || currentFrom)) {
          const cleanSenderEmail = currentFrom.match(/<([^>]+)>/)?.[1] || currentFrom.split(' ')[0] || currentFrom || 'applicant@domain.com';
          const cleanSenderName = currentFrom.replace(/<[^>]+>/, '').trim() || cleanSenderEmail.split('@')[0];
          
          messages.push({
            id: 'msg_' + Math.random().toString(36).substring(2, 11),
            threadId: 'th_' + Math.random().toString(36).substring(2, 11),
            messageId: currentMsgId,
            senderEmail: cleanSenderEmail,
            senderName: cleanSenderName,
            subject: currentSubject || '(No Subject)',
            snippet: currentSubject || 'Email message received',
            bodyText: `Email received from ${cleanSenderName} (${cleanSenderEmail}).`,
            bodyHtml: `<p>Email received from <strong>${cleanSenderName}</strong> (${cleanSenderEmail}).</p><p>Subject: ${currentSubject}</p>`,
            folder: 'inbox',
            isRead: false,
            isStarred: false,
            receivedAt: new Date(currentDate).toString() !== 'Invalid Date' ? new Date(currentDate).toISOString() : new Date().toISOString(),
          });

          currentSubject = '';
          currentFrom = '';
          currentMsgId = '';
        }
      }

      if (currentSubject || currentFrom) {
        const cleanSenderEmail = currentFrom.match(/<([^>]+)>/)?.[1] || currentFrom.split(' ')[0] || currentFrom || 'applicant@domain.com';
        const cleanSenderName = currentFrom.replace(/<[^>]+>/, '').trim() || cleanSenderEmail.split('@')[0];
        messages.push({
          id: 'msg_' + Math.random().toString(36).substring(2, 11),
          threadId: 'th_' + Math.random().toString(36).substring(2, 11),
          messageId: currentMsgId,
          senderEmail: cleanSenderEmail,
          senderName: cleanSenderName,
          subject: currentSubject || '(No Subject)',
          snippet: currentSubject || 'Email message received',
          bodyText: `Email received from ${cleanSenderName} (${cleanSenderEmail}).`,
          bodyHtml: `<p>Email received from <strong>${cleanSenderName}</strong> (${cleanSenderEmail}).</p><p>Subject: ${currentSubject}</p>`,
          folder: 'inbox',
          isRead: false,
          isStarred: false,
          receivedAt: new Date(currentDate).toString() !== 'Invalid Date' ? new Date(currentDate).toISOString() : new Date().toISOString(),
        });
      }

      // Sort from latest to oldest
      messages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

      return messages;
    } catch (err: any) {
      logs?.push(`[IMAP Fetch Error] ${err.message}`);
      return [];
    }
  }

  /**
   * Gracefully close IMAP connection
   */
  async close(logs?: string[]): Promise<void> {
    try {
      await this.executeCommand('LOGOUT', logs);
    } catch (e) {
      // Ignore cleanup error
    } finally {
      if (this.isEdgeSocket) {
        try { this.reader?.releaseLock(); } catch (e) {}
        try { this.writer?.releaseLock(); } catch (e) {}
      } else if (this.tlsSocket) {
        try { this.tlsSocket.destroy(); } catch (e) {}
      }
      logs?.push('[IMAP Helper] IMAP socket connection closed.');
    }
  }
}

/**
 * Perform end-to-end IMAP connection test
 */
export async function testImapConnection(options: ImapConnectOptions): Promise<ImapTestResult> {
  const logs: string[] = [];
  const client = new EdgeImapClient(options);

  try {
    await client.connect(logs);
    await client.login(logs);
    await client.selectMailbox(options.mailbox || 'INBOX', logs);
    await client.close(logs);

    return {
      success: true,
      message: `Successfully connected and authenticated to IMAP server ${options.host}:${options.port || 993}.`,
      logs
    };
  } catch (err: any) {
    logs.push(`[IMAP Helper Error] Connection or authentication failed: ${err.message}`);
    return {
      success: false,
      message: err.message || 'IMAP verification failed.',
      logs
    };
  }
}
