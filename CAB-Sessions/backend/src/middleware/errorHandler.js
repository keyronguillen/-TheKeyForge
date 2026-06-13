/**
 * Central error handler. Converts AppError into a clean JSON response and
 * hides internals for unexpected errors (never leak stack traces to clients).
 */
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/index.js';

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(isProd ? {} : { debug: err.message }),
  });
}

/** 404 fallback for unknown routes. */
export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' });
}
