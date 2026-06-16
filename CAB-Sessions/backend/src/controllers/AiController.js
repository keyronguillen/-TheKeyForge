/**
 * AI HTTP controller. Orchestrates AiService + persistence (review column +
 * ai_insights history) + audit logging. Scoped to req.projectId.
 */
import { AiService } from '../services/AiService.js';
import { TicketService } from '../services/TicketService.js';
import { AiInsightRepository } from '../repositories/AiInsightRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { isAiEnabled } from '../config/index.js';

const ai = new AiService();
const tickets = new TicketService();
const insights = new AiInsightRepository();
const audit = new AuditRepository();

export class AiController {
  /** Lightweight flag so the UI can show/hide AI buttons. */
  static async status(_req, res) {
    res.json({ enabled: isAiEnabled });
  }

  /** Draft the Tab-2 review fields (returned to the client to review & save). */
  static async draftReview(req, res) {
    const id = Number(req.params.id);
    const ticket = await tickets.getDetail(id, req.projectId);
    const { fields, model } = await ai.draftReview(ticket);
    await insights.record({ ticketId: id, projectId: req.projectId, kind: 'draft_review', content: JSON.stringify(fields), model, createdBy: req.user.id });
    await audit.record({ actorId: req.user.id, action: 'ai.draft_review', entity: 'cab_ticket', entityId: id });
    res.json({ fields });
  }

  /** Generate reviewer feedback; persist it to the review column + history. */
  static async feedback(req, res) {
    const id = Number(req.params.id);
    const detail = await tickets.getDetail(id, req.projectId);
    const { feedback, model } = await ai.generateFeedback(detail);
    await insights.saveFeedbackOnReview(id, feedback);
    await insights.record({ ticketId: id, projectId: req.projectId, kind: 'feedback', content: feedback, model, createdBy: req.user.id });
    await audit.record({ actorId: req.user.id, action: 'ai.feedback', entity: 'cab_ticket', entityId: id });
    res.json({ feedback });
  }

  /** Generate a post-CAB report across the active project's tickets. */
  static async report(req, res) {
    const all = await tickets.list(req.projectId);
    const { report, model } = await ai.generateCabReport(all);
    await insights.record({ ticketId: null, projectId: req.projectId, kind: 'cab_report', content: report, model, createdBy: req.user.id });
    await audit.record({ actorId: req.user.id, action: 'ai.cab_report', entity: 'cab', entityId: null });
    res.json({ report });
  }
}
