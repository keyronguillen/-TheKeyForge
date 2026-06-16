/**
 * Tenant-isolation middleware. Reads the active project from the `X-Project-Id`
 * header (the frontend sends it on every scoped request), verifies the user is a
 * member (or Admin), and sets `req.projectId`. This is the server-side boundary
 * that keeps one company's CAB data from leaking into another's — never rely on
 * the UI alone.
 */
import { AppError } from '../utils/AppError.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';

const projects = new ProjectRepository();

export async function requireProject(req, _res, next) {
  const raw = req.headers['x-project-id'];
  const projectId = Number(raw);
  if (!raw || Number.isNaN(projectId)) {
    return next(AppError.badRequest('Select a project first (missing X-Project-Id).'));
  }
  try {
    if (!await projects.userCanAccess(req.user, projectId)) {
      return next(AppError.forbidden('You are not a member of this project.'));
    }
    req.projectId = projectId;
    next();
  } catch (err) {
    next(err);
  }
}
