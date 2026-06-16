import { db } from '../db/database.js';

/** Append-only store of every AI generation (draft / feedback / report). */
export class AiInsightRepository {
  async record({ ticketId, projectId, kind, content, model, createdBy }) {
    const { rows } = await db.run(
      `INSERT INTO ai_insights (ticket_id, project_id, kind, content, model, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [ticketId ?? null, projectId ?? null, kind, content, model ?? null, createdBy ?? null],
    );
    return rows[0];
  }

  /** Persist the latest feedback onto the ticket's review row (Tab 2 column). */
  async saveFeedbackOnReview(ticketId, feedback) {
    await db.run(
      `INSERT INTO ticket_reviews (ticket_id, ai_feedback, ai_generated_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (ticket_id) DO UPDATE SET
         ai_feedback = EXCLUDED.ai_feedback,
         ai_generated_at = now()`,
      [ticketId, feedback],
    );
  }
}
