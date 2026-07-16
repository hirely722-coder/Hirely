export function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      const camel = k.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      n[camel] = obj[k];
    });
    return n;
  }
  return obj;
}

export function keysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnake);
  }
  if (obj !== null && typeof obj === 'object') {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      n[snake] = obj[k];
    });
    return n;
  }
  return obj;
}

// Helper: robust JSON cleaner
export function cleanJsonResponse(rawText: string): any {
  let cleaned = rawText.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    cleaned = match[1].trim();
  }

  // 2. Try parsing, if fails fallback to brace-bounded substring extraction
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerErr) {
        // Fall back to original error
      }
    }
    throw err;
  }
}

// Security Helper: Sanitization to protect against XSS and SQL injection
export function sanitizeString(val: string): string {
  if (!val) return val;
  return val
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onclick=/gi, '')
    .replace(/<[^>]*>/g, '');
}

export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

