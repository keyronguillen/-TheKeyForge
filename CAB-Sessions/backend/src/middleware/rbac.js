/**
 * Role-based access control (Section 3). Routes declare the *capability* they
 * require; this middleware enforces it against the authenticated user's role.
 * Capability-based checks keep routes decoupled from the role matrix.
 */
import { roleHasCapability } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';

/** @param {string} capability one of CAP.* */
export function requireCapability(capability) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roleHasCapability(req.user.role, capability)) {
      return next(AppError.forbidden(`Your role (${req.user.role}) cannot perform this action.`));
    }
    next();
  };
}
