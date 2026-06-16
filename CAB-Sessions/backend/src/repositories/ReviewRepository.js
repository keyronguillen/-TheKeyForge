import { db } from '../db/database.js';

/** Review rows are 1:1 with a ticket (ticket_id is the PK) — upsert. */
export class ReviewRepository {
  async upsert(ticketId, { tools_touched, compliance_process, what_it_fixes, what_deprecated }, updatedBy) {
    await db.run(
      `INSERT INTO ticket_reviews
         (ticket_id, tools_touched, compliance_process, what_it_fixes, what_deprecated, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (ticket_id) DO UPDATE SET
         tools_touched      = EXCLUDED.tools_touched,
         compliance_process = EXCLUDED.compliance_process,
         what_it_fixes      = EXCLUDED.what_it_fixes,
         what_deprecated    = EXCLUDED.what_deprecated,
         updated_by         = EXCLUDED.updated_by,
         updated_at         = now()`,
      [ticketId, tools_touched ?? null, compliance_process ?? null,
        what_it_fixes ?? null, what_deprecated ?? null, updatedBy ?? null],
    );
    return db.get('SELECT * FROM ticket_reviews WHERE ticket_id = $1', [ticketId]);
  }
}
