import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AdoController } from '../controllers/AdoController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { requireCapability } from '../middleware/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CAP } from '../constants/roles.js';

export const adoRoutes = Router();

adoRoutes.use(authenticate);

// External calls — throttle.
const adoLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true });

// Status is project-agnostic so the UI can probe it on load.
adoRoutes.get('/ado/status', asyncHandler(AdoController.status));

// Listing/importing need an active project membership.
adoRoutes.get('/ado/workitems', adoLimiter, requireProject, requireCapability(CAP.VIEW), asyncHandler(AdoController.list));
adoRoutes.post('/ado/import/:id', adoLimiter, requireProject, requireCapability(CAP.MANAGE_TICKETS), asyncHandler(AdoController.import));
