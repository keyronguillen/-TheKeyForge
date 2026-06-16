import { db } from '../db/database.js';
import { ROLES } from '../constants/roles.js';

/**
 * Companies, projects and membership. The isolation guarantee lives here:
 * `accessibleTo` returns only the projects a user may enter (Admins see all),
 * and `userCanAccess` is the server-side gate used on every scoped request.
 */
export class ProjectRepository {
  /** Projects a user can open, with their company name. Admins see everything. */
  async accessibleTo(user) {
    if (user.role === ROLES.ADMIN) {
      return db.all(
        `SELECT p.id, p.name, p.company_id, c.name AS company
           FROM projects p JOIN companies c ON c.id = p.company_id
          ORDER BY c.name, p.name`,
      );
    }
    return db.all(
      `SELECT p.id, p.name, p.company_id, c.name AS company
         FROM projects p
         JOIN companies c ON c.id = p.company_id
         JOIN project_members m ON m.project_id = p.id
        WHERE m.user_id = $1
        ORDER BY c.name, p.name`,
      [user.id],
    );
  }

  /** True if the user may access the project (member, or Admin). */
  async userCanAccess(user, projectId) {
    if (user.role === ROLES.ADMIN) {
      return Boolean(await db.get('SELECT 1 FROM projects WHERE id = $1', [projectId]));
    }
    const row = await db.get(
      'SELECT 1 FROM project_members WHERE user_id = $1 AND project_id = $2',
      [user.id, projectId],
    );
    return Boolean(row);
  }

  // ── Seed/admin helpers ──
  async upsertCompany(name) {
    const { rows } = await db.run(
      `INSERT INTO companies (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
      [name],
    );
    return rows[0];
  }

  async upsertProject(companyId, name) {
    const { rows } = await db.run(
      `INSERT INTO projects (company_id, name) VALUES ($1, $2)
       ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
      [companyId, name],
    );
    return rows[0];
  }

  async addMember(projectId, userId) {
    await db.run(
      `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectId, userId],
    );
  }
}
