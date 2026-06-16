/**
 * ServiceNow HTTP controller. Lists Change Requests and imports one into the
 * active project's CAB board. Scoped to req.projectId.
 */
import { ServiceNowService } from '../services/ServiceNowService.js';
import { TicketService } from '../services/TicketService.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { isSnowEnabled, config } from '../config/index.js';

const snow = new ServiceNowService();
const tickets = new TicketService();
const audit = new AuditRepository();

export class SnowController {
  /** Probe so the UI can show/hide the ServiceNow view. */
  static async status(_req, res) {
    res.json({ enabled: isSnowEnabled, table: isSnowEnabled ? config.snow.table : null });
  }

  /** Live list of Change Requests from the configured instance. */
  static async list(_req, res) {
    res.json({ changes: await snow.listChanges() });
  }

  /** Import a ServiceNow Change Request as a CAB ticket in the active project. */
  static async import(req, res) {
    const change = await snow.getChange(req.params.sysId);
    const today = new Date().toISOString().slice(0, 10);
    const ticket = await tickets.create({
      requestor: change.assignedTo || 'ServiceNow',
      requestedDate: today,
      snowTicketNumber: change.number,
      snowDescription: change.description || change.title,
    }, req.user, req.projectId);
    await audit.record({ actorId: req.user.id, action: 'snow.import', entity: 'cab_ticket', entityId: ticket.id, detail: { number: change.number } });
    res.status(201).json({ ticket, source: change });
  }
}
