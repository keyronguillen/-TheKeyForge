import { BaseRepository } from './BaseRepository.js';

/**
 * CAB tickets plus their 1:1 review and latest approval. Always scoped to a
 * project_id so tenants never see each other's data.
 */
export class TicketRepository extends BaseRepository {
  constructor() {
    super('cab_tickets');
  }

  /** Full list for one project's CAB table, with current decision for the chip. */
  async listForProject(projectId) {
    return this.db.all(
      `SELECT t.*, a.decision AS decision, a.decided_at AS decided_at
         FROM cab_tickets t
         LEFT JOIN approvals a ON a.ticket_id = t.id
        WHERE t.project_id = $1
        ORDER BY t.requested_date DESC, t.id DESC`,
      [projectId],
    );
  }

  /** Per-bucket counts for the overview (to_present / approved / declined). */
  async countsForProject(projectId) {
    const rows = await this.db.all(
      `SELECT
         SUM(CASE WHEN a.decision = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN a.decision IN ('rejected','to_be_reviewed') THEN 1 ELSE 0 END) AS declined,
         SUM(CASE WHEN a.decision IS NULL OR a.decision = 'pending' THEN 1 ELSE 0 END) AS to_present,
         COUNT(*) AS total
       FROM cab_tickets t
       LEFT JOIN approvals a ON a.ticket_id = t.id
       WHERE t.project_id = $1`,
      [projectId],
    );
    const r = rows[0] ?? {};
    return {
      to_present: Number(r.to_present ?? 0),
      approved: Number(r.approved ?? 0),
      declined: Number(r.declined ?? 0),
      total: Number(r.total ?? 0),
    };
  }

  /** Fetch one ticket only if it belongs to the given project (isolation guard). */
  async findInProject(id, projectId) {
    return this.db.get(
      'SELECT * FROM cab_tickets WHERE id = $1 AND project_id = $2',
      [id, projectId],
    );
  }

  /** Single ticket with review (Tab 2) and approval (Tab 3) joined in. */
  async findDetail(id, projectId) {
    const ticket = await this.findInProject(id, projectId);
    if (!ticket) return null;
    const review = await this.db.get('SELECT * FROM ticket_reviews WHERE ticket_id = $1', [id]);
    const approval = await this.db.get('SELECT * FROM approvals WHERE ticket_id = $1', [id]);
    return { ...ticket, review: review ?? null, approval: approval ?? null };
  }
}
