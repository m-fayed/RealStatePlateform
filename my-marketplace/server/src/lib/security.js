import process from 'node:process';
import { z } from 'zod';

export function validateAdminConfig(env = process.env) {
  const email = z.string().email().safeParse(env.ADMIN_EMAIL);
  const password = env.ADMIN_PASSWORD || '';
  if (!email.success || password.length < 12 || password.length > 72 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password) ||
      /admin123|password|replace|changeme/i.test(password)) {
    throw new Error('ADMIN_EMAIL must be valid; ADMIN_PASSWORD must be 12–72 characters with uppercase, lowercase, a number and a symbol, and must not be a placeholder.');
  }
  return { email: email.data, password };
}

export function validateStartupConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  validateAdminConfig(env);
  const secret = env.JWT_SECRET;
  const repeated = typeof secret === 'string' && Array.from({ length: Math.floor(secret.length / 2) }, (_, index) => index + 1)
    .some((size) => secret.length % size === 0 && secret === secret.slice(0, size).repeat(secret.length / size));
  if (typeof secret !== 'string' || secret.length < 32 || /\s/.test(secret) ||
      new Set(secret).size < 8 || repeated ||
      /replace|changeme|placeholder|password|jwt[-_ ]?secret|abcdefghijklmnopqrstuvwxyz|0123456789/i.test(secret)) {
    throw new Error('JWT_SECRET must contain at least 32 cryptographically random characters; missing, placeholder, repetitive or weak values are not allowed.');
  }
}

// In-memory limits for this single-process server. Reserve slots before handling
// requests so simultaneous failures cannot bypass the login limit.
export function createRateLimit({ limit, windowMs, failedOnly = false, now = Date.now }) {
  const entries = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, attempts] of entries) {
      const active = attempts.filter((attempt) => time - attempt.at < windowMs);
      if (active.length) entries.set(key, active);
      else entries.delete(key);
    }
    const key = req.ip;
    const attempts = entries.get(key) || [];
    if (attempts.length >= limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((attempts[0].at + windowMs - time) / 1000))));
      return res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
    }
    const attempt = { at: time };
    attempts.push(attempt);
    entries.set(key, attempts);
    if (failedOnly) res.once('finish', () => {
      if (res.statusCode < 400 || res.statusCode >= 500) {
        const remaining = (entries.get(key) || []).filter((entry) => entry !== attempt);
        if (remaining.length) entries.set(key, remaining);
        else entries.delete(key);
      }
    });
    next();
  };
}

export const loginLimiter = createRateLimit({ limit: 5, windowMs: 15 * 60 * 1000, failedOnly: true });
export const uploadLimiter = createRateLimit({ limit: 20, windowMs: 15 * 60 * 1000 });
