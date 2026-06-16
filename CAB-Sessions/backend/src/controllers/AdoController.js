/**
 * Azure DevOps HTTP controller. Lists live work items and imports one into the
 * active project's CAB board. Scoped to req.projectId.
 */
import { AzureDevOpsService } from '../services/AzureDevOpsService.js';
import { TicketService } from '../services/TicketService.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { isAdoEnabled, config } from '../config/index.js';

const ado = new AzureDevOpsService();
const tickets = new TicketService();
const audit = new AuditRepository();

export class AdoController {
  /** Probe so the UI can show/hide the Azure Boards view. */
  static async status(_req, res) {
    res.json({
      enabled: isAdoEnabled,
      project: isAdoEnabled ? config.ado.project : null,
      types: config.ado.types,
    });
  }

  /** Live list of Epics/Features/Tasks from the configured ADO project. */
  static async list(_req, res) {
    res.json({ workItems: await ado.listWorkItems() });
  }

  /** Import an ADO work item as a CAB ticket in the active project. */
  static async import(req, res) {
    const id = Number(req.params.id);
    const wi = await ado.getWorkItem(id);
    const today = new Date().toISOString().slice(0, 10);
    const ticket = await tickets.create({
      requestor: wi.assignedTo || `ADO ${wi.type}`,
      requestedDate: today,
      adoTicketNumber: `AB#${wi.id}`,
      adoDescription: wi.description || wi.title,
    }, req.user, req.projectId);
    await audit.record({ actorId: req.user.id, action: 'ado.import', entity: 'cab_ticket', entityId: ticket.id, detail: { adoId: wi.id, type: wi.type } });
    res.status(201).json({ ticket, source: wi });
  }
}
