import { db } from '../db/database.js';

/** Append-only audit trail. There is intentionally no update/delete here. */
export class AuditRepository {
  async record({ actorId, action, entity, entityId, detail }) {
    await db.run(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorId ?? null, action, entity ?? null, entityId ?? null,
        detail ? JSON.stringify(detail) : null],
    );
  }

  async recent(limit = 100) {
    return db.all(
      `SELECT al.*, u.full_name AS actor_name
         FROM audit_log al
         LEFT JOIN users u ON u.id = al.actor_id
        ORDER BY al.id DESC
        LIMIT $1`,
      [limit],
    );
  }
}
