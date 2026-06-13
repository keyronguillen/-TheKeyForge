import { BaseRepository } from './BaseRepository.js';

/**
 * CAB tickets plus their 1:1 review row and latest approval, assembled into the
 * shape the frontend table/tabs need.
 */
export class TicketRepository extends BaseRepository {
  constructor() {
    super('cab_tickets');
  }

  /** Full list for the CAB table (Tab 1), with current decision for the chip. */
  listForBoard() {
    return this.db.all(
      `SELECT t.*,
              a.decision   AS decision,
              a.decided_at AS decided_at
         FROM cab_tickets t
         LEFT JOIN approvals a ON a.ticket_id = t.id
        ORDER BY t.requested_date DESC, t.id DESC`,
    );
  }

  /** Single ticket with review (Tab 2) and approval (Tab 3) joined in. */
  findDetail(id) {
    const ticket = this.findById(id);
    if (!ticket) return null;
    const review = this.db.get(
      'SELECT * FROM ticket_reviews WHERE ticket_id = ?',
      [id],
    );
    const approval = this.db.get(
      'SELECT * FROM approvals WHERE ticket_id = ?',
      [id],
    );
    return { ...ticket, review: review ?? null, approval: approval ?? null };
  }
}
