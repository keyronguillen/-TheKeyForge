import { db } from '../db/database.js';

/** Append-only audit trail. There is intentionally no update/delete here. */
export class AuditRepository {
  record({ actorId, action, entity, entityId, detail }) {
    db.run(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [actorId ?? null, action, entity ?? null, entityId ?? null,
        detail ? JSON.stringify(detail) : null],
    );
  }

  recent(limit = 100) {
    return db.all(
      `SELECT al.*, u.full_name AS actor_name
         FROM audit_log al
         LEFT JOIN users u ON u.id = al.actor_id
        ORDER BY al.id DESC
        LIMIT ?`,
      [limit],
    );
  }
}
