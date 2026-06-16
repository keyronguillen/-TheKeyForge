/** Aggregates all route modules under /api. */
import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { ticketRoutes } from './ticketRoutes.js';
import { approvalRoutes } from './approvalRoutes.js';
import { userRoutes } from './userRoutes.js';
import { aiRoutes } from './aiRoutes.js';
import { projectRoutes } from './projectRoutes.js';
import { adoRoutes } from './adoRoutes.js';
import { snowRoutes } from './snowRoutes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', service: 'cab-sessions' }));
apiRouter.use('/auth', authRoutes);
apiRouter.use('/', projectRoutes); // /me/projects (auth, not project-scoped)
apiRouter.use('/tickets', ticketRoutes);
apiRouter.use('/tickets', approvalRoutes); // /tickets/:id/decision
apiRouter.use('/admin', userRoutes);
apiRouter.use('/', aiRoutes); // /ai/status, /tickets/:id/ai/*, /ai/cab-report
apiRouter.use('/', adoRoutes); // /ado/status, /ado/workitems, /ado/import/:id
apiRouter.use('/', snowRoutes); // /snow/status, /snow/changes, /snow/import/:sysId
