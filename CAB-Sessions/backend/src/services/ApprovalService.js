/**
 * Approval workflow (Section 2, Tab 3):
 *   - record decision (approved / rejected / to_be_reviewed)
 *   - stamp decided_at server-side
 *   - email the decision (NotificationService)
 *   - push the decision to ServiceNow & ADO (IntegrationService, stubbed)
 *   - emit a real-time event so the board updates live
 *
 * Orchestration lives here; each side-effect is delegated to its own service
 * (single-responsibility) and the whole thing is audited.
 */
import { ApprovalRepository } from '../repositories/ApprovalRepository.js';
import { TicketRepository } from '../repositories/TicketRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { NotificationService } from './NotificationService.js';
import { IntegrationService } from './IntegrationService.js';
import { realtime, EVENTS } from '../realtime/socket.js';
import { DECISION, DECISION_VALUES } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';

export class ApprovalService {
  constructor() {
    this.approvals = new ApprovalRepository();
    this.tickets = new TicketRepository();
    this.users = new UserRepository();
    this.audit = new AuditRepository();
    this.notifier = new NotificationService();
    this.integration = new IntegrationService();
  }

  /**
   * Record a decision and run the downstream actions.
   * @param {number} ticketId
   * @param {{decision:string, comment?:string, notify?:boolean, pushIntegration?:boolean}} input
   * @param {{id:number, fullName:string}} actor
   */
  async decide(ticketId, input, actor) {
    const ticket = this.tickets.findById(ticketId);
    if (!ticket) throw AppError.notFound('CAB ticket not found.');
    if (!DECISION_VALUES.includes(input.decision)) {
      throw AppError.badRequest(`Invalid decision "${input.decision}".`);
    }

    const approval = this.approvals.decide(ticketId, {
      decision: input.decision,
      decidedBy: actor.id,
      comment: input.comment,
    });
    // Lock the ticket to "decided" once a terminal decision is taken.
    if (input.decision === DECISION.APPROVED || input.decision === DECISION.REJECTED) {
      this.tickets.update(ticketId, { status: 'decided' });
    }
    this.audit.record({
      actorId: actor.id, action: 'approval.decide', entity: 'cab_ticket', entityId: ticketId,
      detail: { decision: input.decision, comment: input.comment ?? null },
    });

    // ── Side-effects (best-effort; failures are reported but don't lose the decision) ──
    const result = { approval, notification: null, integration: null };

    if (input.notify !== false) {
      const recipient = ticket.assignee && ticket.assignee.includes('@')
        ? ticket.assignee
        : this.#requestorEmail(ticket);
      const sent = await this.notifier.sendDecisionEmail({
        to: recipient,
        ticket,
        decision: input.decision,
        decidedBy: actor.fullName,
        comment: input.comment,
      });
      if (sent) this.approvals.markNotified(ticketId);
      result.notification = { sent, to: recipient };
    }

    if (input.pushIntegration) {
      result.integration = await this.integration.pushDecision(ticket, input.decision);
      this.approvals.markIntegrationPushed(ticketId);
      this.audit.record({
        actorId: actor.id, action: 'integration.push', entity: 'cab_ticket', entityId: ticketId,
        detail: result.integration,
      });
    }

    realtime.emit(EVENTS.DECISION_MADE, {
      ticketId,
      decision: input.decision,
      decidedAt: approval.decided_at,
      decidedBy: actor.fullName,
    });

    return result;
  }

  /** Fallback recipient: a demo placeholder derived from the requestor name. */
  #requestorEmail(ticket) {
    const slug = String(ticket.requestor || 'requestor').toLowerCase().replace(/[^a-z0-9]+/g, '.');
    return `${slug}@cab.local`;
  }
}
