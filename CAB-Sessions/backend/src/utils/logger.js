/**
 * Tiny structured logger. Kept dependency-free for the POC; swap for pino/winston
 * in production. Centralizing logging means we can add transport/levels in one place.
 */
const ts = () => new Date().toISOString();

export const logger = {
  info: (msg, meta) => console.log(`[INFO]  ${ts()}  ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[WARN]  ${ts()}  ${msg}`, meta ?? ''),
  error: (msg, meta) => console.error(`[ERROR] ${ts()}  ${msg}`, meta ?? ''),
};
