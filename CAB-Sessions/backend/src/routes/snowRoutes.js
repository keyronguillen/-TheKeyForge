import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { SnowController } from '../controllers/SnowController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { requireCapability } from '../middleware/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CAP } from '../constants/roles.js';

export const snowRoutes = Router();

snowRoutes.use(authenticate);

const snowLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true });

// Status is project-agnostic so the UI can probe it on load.
snowRoutes.get('/snow/status', asyncHandler(SnowController.status));

// Listing/importing need an active project membership.
snowRoutes.get('/snow/changes', snowLimiter, requireProject, requireCapability(CAP.VIEW), asyncHandler(SnowController.list));
snowRoutes.post('/snow/import/:sysId', snowLimiter, requireProject, requireCapability(CAP.MANAGE_TICKETS), asyncHandler(SnowController.import));
