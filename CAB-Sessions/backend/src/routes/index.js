/** Aggregates all route modules under /api. */
import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { ticketRoutes } from './ticketRoutes.js';
import { approvalRoutes } from './approvalRoutes.js';
import { userRoutes } from './userRoutes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', service: 'cab-sessions' }));
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tickets', ticketRoutes);
apiRouter.use('/tickets', approvalRoutes); // /tickets/:id/decision
apiRouter.use('/admin', userRoutes);
