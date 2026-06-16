/** Admin user management + audit view + GDPR erasure (async). */
import { UserRepository } from '../repositories/UserRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { ALL_ROLES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';

const users = new UserRepository();
const audit = new AuditRepository();

export class UserController {
  static async list(_req, res) {
    res.json({ users: await users.listSafe(), roles: ALL_ROLES });
  }

  /** Change a user's role (Admin only). */
  static async setRole(req, res) {
    const { role } = req.body;
    if (!ALL_ROLES.includes(role)) throw AppError.badRequest('Unknown role.');
    const target = Number(req.params.id);
    const roleId = await users.roleIdByName(role);
    await users.update(target, { role_id: roleId, updated_at: new Date().toISOString() });
    await audit.record({ actorId: req.user.id, action: 'user.role_change', entity: 'user', entityId: target, detail: { role } });
    res.json({ ok: true });
  }

  static async auditLog(_req, res) {
    res.json({ entries: await audit.recent(200) });
  }

  /**
   * GDPR right-to-erasure: anonymize PII while keeping the row so the immutable
   * audit trail stays referentially intact. The account is deactivated.
   */
  static async erase(req, res) {
    const target = Number(req.params.id);
    if (target === req.user.id) throw AppError.badRequest('You cannot erase your own admin account.');
    await users.update(target, {
      full_name: 'Erased user',
      email: `erased+${target}@cab.invalid`,
      password_hash: 'erased',
      mfa_secret: null,
      mfa_enabled: false,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    await audit.record({ actorId: req.user.id, action: 'gdpr.erase', entity: 'user', entityId: target });
    res.json({ ok: true });
  }
}
