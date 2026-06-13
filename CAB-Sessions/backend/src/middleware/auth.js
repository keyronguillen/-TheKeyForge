/**
 * JWT authentication middleware. Verifies the Bearer token and attaches a
 * lightweight `req.user` ({ id, role, fullName }) for downstream handlers.
 */
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { UserRepository } from '../repositories/UserRepository.js';

const users = new UserRepository();

export function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized());
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    // Re-load the user so role/active changes take effect without re-login.
    const user = users.findByIdWithRole(payload.sub);
    if (!user || !user.is_active) return next(AppError.unauthorized('Account is inactive.'));
    req.user = { id: user.id, role: user.role, fullName: user.full_name, email: user.email };
    next();
  } catch {
    next(AppError.unauthorized('Session expired or invalid.'));
  }
}
