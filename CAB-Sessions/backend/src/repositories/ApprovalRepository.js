import { db } from '../db/database.js';

/** Each ticket has exactly one approval record (created lazily on first decision). */
export class ApprovalRepository {
  async findByTicket(ticketId) {
    return db.get('SELECT * FROM approvals WHERE ticket_id = $1', [ticketId]);
  }

  /**
   * Record (or update) the decision for a ticket via upsert. decided_at is
   * stamped server-side so the timestamp is trustworthy. Returns the row.
   */
  async decide(ticketId, { decision, decidedBy, comment }) {
    await db.run(
      `INSERT INTO approvals (ticket_id, decision, decided_by, comment, decided_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (ticket_id) DO UPDATE SET
         decision = EXCLUDED.decision,
         decided_by = EXCLUDED.decided_by,
         comment = EXCLUDED.comment,
         decided_at = now(),
         notified = FALSE,
         integration_pushed = FALSE`,
      [ticketId, decision, decidedBy, comment ?? null],
    );
    return this.findByTicket(ticketId);
  }

  async markNotified(ticketId) {
    await db.run('UPDATE approvals SET notified = TRUE WHERE ticket_id = $1', [ticketId]);
  }

  async markIntegrationPushed(ticketId) {
    await db.run('UPDATE approvals SET integration_pushed = TRUE WHERE ticket_id = $1', [ticketId]);
  }
}
