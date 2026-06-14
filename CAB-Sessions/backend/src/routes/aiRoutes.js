import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AiController } from '../controllers/AiController.js';
import { authenticate } from '../middleware/auth.js';
import { requireCapability } from '../middleware/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CAP } from '../constants/roles.js';

export const aiRoutes = Router();

aiRoutes.use(authenticate);

// AI calls cost money and hit an external API — throttle per client.
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true });

// Status is cheap and unthrottled so the UI can probe it on load.
aiRoutes.get('/ai/status', asyncHandler(AiController.status));

// Generation endpoints require the USE_AI capability.
aiRoutes.post('/tickets/:id/ai/draft-review', aiLimiter, requireCapability(CAP.USE_AI), asyncHandler(AiController.draftReview));
aiRoutes.post('/tickets/:id/ai/feedback', aiLimiter, requireCapability(CAP.USE_AI), asyncHandler(AiController.feedback));
aiRoutes.post('/ai/cab-report', aiLimiter, requireCapability(CAP.USE_AI), asyncHandler(AiController.report));
