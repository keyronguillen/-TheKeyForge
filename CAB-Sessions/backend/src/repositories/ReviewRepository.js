import { db } from '../db/database.js';

/**
 * Review rows have a 1:1 relationship with a ticket (ticket_id is the PK), so
 * this repository uses an upsert rather than the generic insert/update.
 */
export class ReviewRepository {
  /** Insert or update the review for a ticket. */
  upsert(ticketId, { tools_touched, compliance_process, what_it_fixes, what_deprecated }, updatedBy) {
    db.run(
      `INSERT INTO ticket_reviews
         (ticket_id, tools_touched, compliance_process, what_it_fixes, what_deprecated, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(ticket_id) DO UPDATE SET
         tools_touched      = excluded.tools_touched,
         compliance_process = excluded.compliance_process,
         what_it_fixes      = excluded.what_it_fixes,
         what_deprecated    = excluded.what_deprecated,
         updated_by         = excluded.updated_by,
         updated_at         = datetime('now')`,
      [ticketId, tools_touched ?? null, compliance_process ?? null,
        what_it_fixes ?? null, what_deprecated ?? null, updatedBy ?? null],
    );
    return db.get('SELECT * FROM ticket_reviews WHERE ticket_id = ?', [ticketId]);
  }
}
