import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  registerSchema, loginSchema, mfaVerifySchema, mfaConfirmSchema,
} from '../validation/schemas.js';

export const authRoutes = Router();

// Throttle auth endpoints to blunt credential-stuffing / brute force.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true });

authRoutes.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(AuthController.register));
authRoutes.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(AuthController.login));
authRoutes.post('/mfa/verify', authLimiter, validateBody(mfaVerifySchema), asyncHandler(AuthController.verifyMfa));
authRoutes.post('/mfa/confirm', authLimiter, validateBody(mfaConfirmSchema), asyncHandler(AuthController.confirmEnrollment));
authRoutes.get('/me', authenticate, asyncHandler(AuthController.me));
