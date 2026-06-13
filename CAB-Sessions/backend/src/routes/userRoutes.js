import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.js';
import { requireCapability } from '../middleware/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CAP } from '../constants/roles.js';

export const userRoutes = Router();

// Admin-only area (MANAGE_USERS capability ⇒ Admin role).
userRoutes.use(authenticate, requireCapability(CAP.MANAGE_USERS));

userRoutes.get('/users', asyncHandler(UserController.list));
userRoutes.put('/users/:id/role', asyncHandler(UserController.setRole));
userRoutes.delete('/users/:id', asyncHandler(UserController.erase)); // GDPR erasure
userRoutes.get('/audit', asyncHandler(UserController.auditLog));
