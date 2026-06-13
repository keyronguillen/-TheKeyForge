/** CAB ticket HTTP controller (Tab 1 + Tab 2). */
import { TicketService } from '../services/TicketService.js';

const tickets = new TicketService();

export class TicketController {
  static async list(_req, res) {
    res.json({ tickets: tickets.list() });
  }

  static async detail(req, res) {
    res.json({ ticket: tickets.getDetail(Number(req.params.id)) });
  }

  static async create(req, res) {
    const ticket = tickets.create(req.body, req.user);
    res.status(201).json({ ticket });
  }

  static async update(req, res) {
    const ticket = tickets.update(Number(req.params.id), req.body, req.user);
    res.json({ ticket });
  }

  static async saveReview(req, res) {
    const review = tickets.saveReview(Number(req.params.id), req.body, req.user);
    res.json({ review });
  }
}
