/**
 * Centralized, validated application configuration.
 *
 * Reading process.env in exactly one place keeps the rest of the codebase DRY
 * and makes misconfiguration fail fast (instead of surfacing as a confusing
 * runtime error deep in a request).
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend/ root, used to resolve relative paths (e.g. the SQLite file).
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

/** Small helper: read an env var, falling back to a default. */
const env = (key, fallback) => process.env[key] ?? fallback;

export const config = Object.freeze({
  env: env('NODE_ENV', 'development'),
  port: Number(env('PORT', 4000)),
  // One or more allowed browser origins (comma-separated). Trailing slashes are
  // stripped so a value like "https://app.vercel.app/" still matches the Origin
  // header the browser sends (which never has a trailing slash).
  clientOrigins: env('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  jwt: {
    secret: env('JWT_SECRET', 'insecure-dev-secret-change-me'),
    expiresIn: env('JWT_EXPIRES_IN', '8h'),
  },

  mfa: {
    issuer: env('MFA_ISSUER', 'CAB-Sessions'),
  },

  db: {
    // Absolute path to the SQLite file.
    file: path.resolve(BACKEND_ROOT, env('DB_FILE', './data/cab.sqlite')),
  },

  mail: {
    from: env('MAIL_FROM', 'cab-no-reply@cab.local'),
    smtpHost: env('SMTP_HOST', ''),
  },
});

export const isProd = config.env === 'production';

/**
 * CORS origin allow-list check, used by both Express and Socket.IO.
 *
 * Allows:
 *   - requests with no Origin (curl / server-to-server / health checks)
 *   - any origin explicitly listed in CLIENT_ORIGIN
 *   - any *.vercel.app deployment (POC convenience: Vercel mints a unique
 *     hostname per deploy — production, branch, and preview URLs all differ,
 *     so pinning a single value is impractical)
 *
 * For a production hardening pass, drop the wildcard and list exact origins.
 */
export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const clean = origin.replace(/\/+$/, '');
  if (config.clientOrigins.includes(clean)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(clean)) return true;
  return false;
}

/** Shared CORS options object for Express and Socket.IO (DRY). */
export const corsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
};
