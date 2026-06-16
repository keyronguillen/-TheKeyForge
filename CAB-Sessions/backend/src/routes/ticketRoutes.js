import { Router } from 'express';
import { TicketController } from '../controllers/TicketController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { requireCapability } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CAP } from '../constants/roles.js';
import { ticketCreateSchema, ticketUpdateSchema, reviewSchema } from '../validation/schemas.js';

export const ticketRoutes = Router();

// Every ticket route needs a session AND an accessible active project.
ticketRoutes.use(authenticate, requireProject);

// Reading the board / counts / detail: any authenticated member (VIEW).
ticketRoutes.get('/', requireCapability(CAP.VIEW), asyncHandler(TicketController.list));
ticketRoutes.get('/counts', requireCapability(CAP.VIEW), asyncHandler(TicketController.counts));
ticketRoutes.get('/:id', requireCapability(CAP.VIEW), asyncHandler(TicketController.detail));

// Creating / editing tickets (Tab 1).
ticketRoutes.post('/', requireCapability(CAP.MANAGE_TICKETS), validateBody(ticketCreateSchema), asyncHandler(TicketController.create));
ticketRoutes.put('/:id', requireCapability(CAP.MANAGE_TICKETS), validateBody(ticketUpdateSchema), asyncHandler(TicketController.update));

// Saving review/compliance details (Tab 2).
ticketRoutes.put('/:id/review', requireCapability(CAP.EDIT_REVIEW), validateBody(reviewSchema), asyncHandler(TicketController.saveReview));
