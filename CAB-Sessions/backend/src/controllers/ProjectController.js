/** Projects the current user can open (drives the post-login project picker). */
import { ProjectRepository } from '../repositories/ProjectRepository.js';

const projects = new ProjectRepository();

export class ProjectController {
  /** GET /me/projects → the clients/projects this user belongs to (Admins: all). */
  static async mine(req, res) {
    res.json({ projects: await projects.accessibleTo(req.user) });
  }
}
