/**
 * email_integration_security.ts
 * AES-256-GCM token encryption / decryption + PKCE helpers for OAuth 2.0
 */

import crypto from 'crypto';

// ── Encryption Key Setup ──────────────────────────────────────────────────────

const RAW_KEY = process.env.ENCRYPTION_KEY || 'hirly-secure-secret-key-32-chars-long-2026';

/**
 * Derive a stable 32-byte key from the env string using SHA-256 so any
 * string length works without crashing.
 */
function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(RAW_KEY).digest();
}

const ENCRYPTION_KEY: Buffer = deriveKey();
const IV_LENGTH = 12;   // 96-bit IV for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

// ── Token Encryption ──────────────────────────────────────────────────────────

/**
 * Encrypt a plain-text token string.
 * Returns:  base64(iv) + "." + base64(ciphertext+tag)
 */
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, tag]);

  return iv.toString('base64') + '.' + payload.toString('base64');
}

/**
 * Decrypt a token previously encrypted by `encryptToken`.
 * Throws if tampering is detected (auth tag mismatch).
 */
export function decryptToken(encrypted: string): string {
  const parts = encrypted.split('.');
  if (parts.length !== 2) throw new Error('Invalid encrypted token format');

  const iv = Buffer.from(parts[0], 'base64');
  const payload = Buffer.from(parts[1], 'base64');

  const ciphertext = payload.slice(0, payload.length - TAG_LENGTH);
  const tag = payload.slice(payload.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}

// ── PKCE Helpers ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-secure PKCE code verifier (43-128 chars,
 * URL-safe base64).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derive a PKCE code challenge (S256 method) from the verifier.
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a cryptographically-secure random state string for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

// ── OAuth Credential Helpers ───────────────────────────────────────────────────

/**
 * Return true if a credential value looks like a placeholder / not yet set.
 */
export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const lc = value.toLowerCase();
  return (
    lc.includes('placeholder') ||
    lc.includes('your-') ||
    lc.includes('xxx') ||
    lc.includes('example')
  );
}
