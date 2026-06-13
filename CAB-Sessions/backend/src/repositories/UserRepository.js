import { BaseRepository } from './BaseRepository.js';

/** Data access for users, joining the human-readable role name. */
export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /** Find an active user by email, including their role name. */
  findByEmail(email) {
    return this.db.get(
      `SELECT u.*, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.email = ? AND u.is_active = 1`,
      [email],
    );
  }

  findByIdWithRole(id) {
    return this.db.get(
      `SELECT u.*, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?`,
      [id],
    );
  }

  /** Admin view: everyone, without sensitive columns. */
  listSafe() {
    return this.db.all(
      `SELECT u.id, u.full_name, u.email, r.name AS role,
              u.mfa_enabled, u.is_active, u.created_at
         FROM users u JOIN roles r ON r.id = u.role_id
        ORDER BY u.created_at DESC`,
    );
  }

  roleIdByName(name) {
    const row = this.db.get('SELECT id FROM roles WHERE name = ?', [name]);
    return row?.id;
  }
}
