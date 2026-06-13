/**
 * Business logic for CAB tickets (Section 1 table + Tab 2 review).
 * Emits real-time events so every connected CAB participant sees changes live.
 */
import { TicketRepository } from '../repositories/TicketRepository.js';
import { ReviewRepository } from '../repositories/ReviewRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { realtime, EVENTS } from '../realtime/socket.js';
import { AppError } from '../utils/AppError.js';

export class TicketService {
  constructor() {
    this.tickets = new TicketRepository();
    this.reviews = new ReviewRepository();
    this.audit = new AuditRepository();
  }

  list() {
    return this.tickets.listForBoard();
  }

  getDetail(id) {
    const detail = this.tickets.findDetail(id);
    if (!detail) throw AppError.notFound('CAB ticket not found.');
    return detail;
  }

  /** Create a CAB ticket. Only whitelisted fields are persisted (no mass-assign). */
  create(data, actor) {
    const ticket = this.tickets.insert({
      requestor: data.requestor,
      requested_date: data.requestedDate,
      uat_proposed_date: data.uatProposedDate ?? null,
      prod_proposed_date: data.prodProposedDate ?? null,
      assignee: data.assignee ?? null,
      snow_ticket_number: data.snowTicketNumber ?? null,
      ado_ticket_number: data.adoTicketNumber ?? null,
      snow_description: data.snowDescription ?? null,
      ado_description: data.adoDescription ?? null,
      created_by: actor.id,
    });
    this.audit.record({ actorId: actor.id, action: 'ticket.create', entity: 'cab_ticket', entityId: ticket.id });
    realtime.emit(EVENTS.TICKET_CREATED, ticket);
    return ticket;
  }

  /** Update editable fields of a ticket. */
  update(id, data, actor) {
    if (!this.tickets.findById(id)) throw AppError.notFound('CAB ticket not found.');
    const patch = this.#whitelist(data);
    patch.updated_at = new Date().toISOString();
    const ticket = this.tickets.update(id, patch);
    this.audit.record({ actorId: actor.id, action: 'ticket.update', entity: 'cab_ticket', entityId: id, detail: patch });
    realtime.emit(EVENTS.TICKET_UPDATED, ticket);
    return ticket;
  }

  /** Save Tab 2 (review/compliance details) and move the ticket to in_review. */
  saveReview(id, data, actor) {
    if (!this.tickets.findById(id)) throw AppError.notFound('CAB ticket not found.');
    const review = this.reviews.upsert(id, data, actor.id);
    this.tickets.update(id, { status: 'in_review', updated_at: new Date().toISOString() });
    this.audit.record({ actorId: actor.id, action: 'ticket.review', entity: 'cab_ticket', entityId: id });
    realtime.emit(EVENTS.TICKET_UPDATED, this.tickets.findById(id));
    return review;
  }

  /** Map camelCase request fields to the snake_case columns we allow updating. */
  #whitelist(data) {
    const map = {
      requestor: 'requestor',
      requestedDate: 'requested_date',
      uatProposedDate: 'uat_proposed_date',
      prodProposedDate: 'prod_proposed_date',
      assignee: 'assignee',
      snowTicketNumber: 'snow_ticket_number',
      adoTicketNumber: 'ado_ticket_number',
      snowDescription: 'snow_description',
      adoDescription: 'ado_description',
    };
    const patch = {};
    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) patch[col] = data[key];
    }
    return patch;
  }
}
