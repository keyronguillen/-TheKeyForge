/**
 * Email notification of CAB decisions (Section 2, Tab 3).
 *
 * POC uses a console transport so the demo has zero external dependencies.
 * Wiring real SMTP later only changes #send() — callers are unaffected (DRY).
 */
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const DECISION_LABEL = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  to_be_reviewed: 'TO BE REVIEWED',
  pending: 'PENDING',
};

export class NotificationService {
  /**
   * Notify a recipient about a CAB decision.
   * @returns {Promise<boolean>} whether the message was "sent".
   */
  async sendDecisionEmail({ to, ticket, decision, decidedBy, comment }) {
    const subject = `[CAB] ${DECISION_LABEL[decision] ?? decision} — ${ticket.snow_ticket_number ?? `Ticket #${ticket.id}`}`;
    const body = [
      `A CAB decision has been recorded.`,
      ``,
      `Decision:      ${DECISION_LABEL[decision] ?? decision}`,
      `Decided by:    ${decidedBy}`,
      `ServiceNow CR: ${ticket.snow_ticket_number ?? '—'}`,
      `ADO Feature:   ${ticket.ado_ticket_number ?? '—'}`,
      `Requestor:     ${ticket.requestor}`,
      comment ? `Comment:       ${comment}` : null,
    ].filter(Boolean).join('\n');

    return this.#send({ to, subject, body });
  }

  /** Internal transport. Swap the body of this method to use real SMTP. */
  async #send({ to, subject, body }) {
    if (!config.mail.smtpHost) {
      // Console transport for the POC.
      logger.info(`📧 (console email) → ${to}  |  ${subject}`);
      console.log('────────────────────────────────────────────\n'
        + `From: ${config.mail.from}\nTo: ${to}\nSubject: ${subject}\n\n${body}\n`
        + '────────────────────────────────────────────');
      return true;
    }
    // TODO: integrate nodemailer/Graph API here for production SMTP.
    logger.warn('SMTP configured but real transport not implemented in POC.');
    return false;
  }
}
