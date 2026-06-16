/** CAB ticket HTTP controller (Tab 1 + Tab 2). Always scoped to req.projectId. */
import { TicketService } from '../services/TicketService.js';

const tickets = new TicketService();

export class TicketController {
  static async list(req, res) {
    res.json({ tickets: await tickets.list(req.projectId) });
  }

  static async counts(req, res) {
    res.json({ counts: await tickets.counts(req.projectId) });
  }

  static async detail(req, res) {
    res.json({ ticket: await tickets.getDetail(Number(req.params.id), req.projectId) });
  }

  static async create(req, res) {
    const ticket = await tickets.create(req.body, req.user, req.projectId);
    res.status(201).json({ ticket });
  }

  static async update(req, res) {
    const ticket = await tickets.update(Number(req.params.id), req.body, req.user, req.projectId);
    res.json({ ticket });
  }

  static async saveReview(req, res) {
    const review = await tickets.saveReview(Number(req.params.id), req.body, req.user, req.projectId);
    res.json({ review });
  }
}
