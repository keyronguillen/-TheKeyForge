/**
 * Approval workflow (Section 2, Tab 3):
 *   - record decision (approved / rejected / to_be_reviewed)
 *   - stamp decided_at server-side
 *   - email the decision (NotificationService)
 *   - push the decision to ServiceNow & ADO (IntegrationService, stubbed)
 *   - emit a real-time event so the board updates live
 *
 * Scoped to the caller's active project (tenant isolation).
 */
import { ApprovalRepository } from '../repositories/ApprovalRepository.js';
import { TicketRepository } from '../repositories/TicketRepository.js';
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
    this.audit = new AuditRepository();
    this.notifier = new NotificationService();
    this.integration = new IntegrationService();
  }

  /**
   * Record a decision and run the downstream actions.
   * @param {number} ticketId
   * @param {{decision:string, comment?:string, notify?:boolean, pushIntegration?:boolean}} input
   * @param {{id:number, fullName:string}} actor
   * @param {number} projectId  the caller's active project (isolation guard)
   */
  async decide(ticketId, input, actor, projectId) {
    const ticket = await this.tickets.findInProject(ticketId, projectId);
    if (!ticket) throw AppError.notFound('CAB ticket not found.');
    if (!DECISION_VALUES.includes(input.decision)) {
      throw AppError.badRequest(`Invalid decision "${input.decision}".`);
    }

    const approval = await this.approvals.decide(ticketId, {
      decision: input.decision,
      decidedBy: actor.id,
      comment: input.comment,
    });
    if (input.decision === DECISION.APPROVED || input.decision === DECISION.REJECTED) {
      await this.tickets.update(ticketId, { status: 'decided' });
    }
    await this.audit.record({
      actorId: actor.id, action: 'approval.decide', entity: 'cab_ticket', entityId: ticketId,
      detail: { decision: input.decision, comment: input.comment ?? null },
    });

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
      if (sent) await this.approvals.markNotified(ticketId);
      result.notification = { sent, to: recipient };
    }

    if (input.pushIntegration) {
      result.integration = await this.integration.pushDecision(ticket, input.decision);
      await this.approvals.markIntegrationPushed(ticketId);
      await this.audit.record({
        actorId: actor.id, action: 'integration.push', entity: 'cab_ticket', entityId: ticketId,
        detail: result.integration,
      });
    }

    realtime.emit(EVENTS.DECISION_MADE, {
      ticketId,
      project_id: projectId,
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
