import { Router } from 'express';
import { ApprovalController } from '../controllers/ApprovalController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { requireCapability } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CAP } from '../constants/roles.js';
import { decisionSchema } from '../validation/schemas.js';

export const approvalRoutes = Router();

approvalRoutes.use(authenticate, requireProject);

// Make a decision (Tab 3) — requires the DECIDE capability.
approvalRoutes.post(
  '/:id/decision',
  requireCapability(CAP.DECIDE),
  validateBody(decisionSchema),
  asyncHandler(ApprovalController.decide),
);
