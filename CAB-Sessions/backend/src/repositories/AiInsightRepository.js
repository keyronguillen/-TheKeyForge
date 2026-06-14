import { db } from '../db/database.js';

/** Append-only store of every AI generation (draft / feedback / report). */
export class AiInsightRepository {
  /** Record one generation and return it. */
  record({ ticketId, kind, content, model, createdBy }) {
    const info = db.run(
      `INSERT INTO ai_insights (ticket_id, kind, content, model, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [ticketId ?? null, kind, content, model ?? null, createdBy ?? null],
    );
    return db.get('SELECT * FROM ai_insights WHERE id = ?', [info.lastInsertRowid]);
  }

  /** Persist the latest feedback onto the ticket's review row (Tab 2 column). */
  saveFeedbackOnReview(ticketId, feedback) {
    // Ensure a review row exists, then set the AI feedback + timestamp.
    db.run(
      `INSERT INTO ticket_reviews (ticket_id, ai_feedback, ai_generated_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(ticket_id) DO UPDATE SET
         ai_feedback = excluded.ai_feedback,
         ai_generated_at = datetime('now')`,
      [ticketId, feedback],
    );
  }

  recentForTicket(ticketId, limit = 10) {
    return db.all(
      'SELECT * FROM ai_insights WHERE ticket_id = ? ORDER BY id DESC LIMIT ?',
      [ticketId, limit],
    );
  }
}
