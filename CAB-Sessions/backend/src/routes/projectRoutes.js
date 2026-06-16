import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const projectRoutes = Router();

// Authenticated, but NOT project-scoped (this is how you discover your projects).
projectRoutes.get('/me/projects', authenticate, asyncHandler(ProjectController.mine));
