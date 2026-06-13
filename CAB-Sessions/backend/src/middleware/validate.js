/**
 * Request validation using Zod schemas. Centralizing validation guarantees
 * every write endpoint rejects malformed/oversized input before it reaches a
 * service (security + data integrity).
 */
import { AppError } from '../utils/AppError.js';

/** @param {import('zod').ZodSchema} schema  validates and replaces req.body */
export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(AppError.badRequest('Validation failed.', details));
    }
    req.body = result.data; // normalized/parsed values
    next();
  };
}
