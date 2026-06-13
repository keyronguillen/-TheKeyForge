import { db } from '../db/database.js';

/** Each ticket has exactly one approval record (created lazily on first decision). */
export class ApprovalRepository {
  findByTicket(ticketId) {
    return db.get('SELECT * FROM approvals WHERE ticket_id = ?', [ticketId]);
  }

  /**
   * Record (or update) the decision for a ticket. Returns the approval row.
   * decided_at is stamped server-side so the timestamp is trustworthy.
   */
  decide(ticketId, { decision, decidedBy, comment }) {
    const existing = this.findByTicket(ticketId);
    if (existing) {
      db.run(
        `UPDATE approvals
            SET decision = ?, decided_by = ?, comment = ?,
                decided_at = datetime('now'), notified = 0, integration_pushed = 0
          WHERE ticket_id = ?`,
        [decision, decidedBy, comment ?? null, ticketId],
      );
    } else {
      db.run(
        `INSERT INTO approvals (ticket_id, decision, decided_by, comment, decided_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [ticketId, decision, decidedBy, comment ?? null],
      );
    }
    return this.findByTicket(ticketId);
  }

  markNotified(ticketId) {
    db.run('UPDATE approvals SET notified = 1 WHERE ticket_id = ?', [ticketId]);
  }

  markIntegrationPushed(ticketId) {
    db.run('UPDATE approvals SET integration_pushed = 1 WHERE ticket_id = ?', [ticketId]);
  }
}
