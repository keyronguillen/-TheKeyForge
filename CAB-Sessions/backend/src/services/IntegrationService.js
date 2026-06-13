/**
 * ServiceNow & Azure DevOps integration seam (Section 2, Tab 3:
 * "Update tickets on ServiceNow and ADO by dropdown actions").
 *
 * For the POC these are STUBS that simulate the calls and log what *would* be
 * sent. The method signatures match what a real client would expose, so the
 * production swap is contained entirely within this class.
 */
import { logger } from '../utils/logger.js';

const SNOW_STATE = {
  approved: 'Implement',
  rejected: 'Cancelled',
  to_be_reviewed: 'Assess',
};

export class IntegrationService {
  /**
   * Push the CAB decision to the linked ServiceNow Change Request.
   * @returns {Promise<{ok:boolean, system:string, ref:string|null, mapped:string}>}
   */
  async updateServiceNow(ticket, decision) {
    const mapped = SNOW_STATE[decision] ?? 'Assess';
    // Real impl: PATCH https://<instance>.service-now.com/api/now/table/change_request/{sys_id}
    logger.info(`🔗 [STUB] ServiceNow ${ticket.snow_ticket_number ?? 'N/A'} → state "${mapped}"`);
    return { ok: true, system: 'ServiceNow', ref: ticket.snow_ticket_number ?? null, mapped };
  }

  /**
   * Reflect the decision on the linked Azure DevOps Feature (e.g. a tag/state).
   */
  async updateAzureDevOps(ticket, decision) {
    const mapped = decision === 'approved' ? 'Approved'
      : decision === 'rejected' ? 'Removed' : 'In Review';
    // Real impl: PATCH https://dev.azure.com/{org}/{project}/_apis/wit/workitems/{id}
    logger.info(`🔗 [STUB] Azure DevOps ${ticket.ado_ticket_number ?? 'N/A'} → state "${mapped}"`);
    return { ok: true, system: 'AzureDevOps', ref: ticket.ado_ticket_number ?? null, mapped };
  }

  /** Convenience: push to both systems and collect the results. */
  async pushDecision(ticket, decision) {
    const [snow, ado] = await Promise.all([
      this.updateServiceNow(ticket, decision),
      this.updateAzureDevOps(ticket, decision),
    ]);
    return { snow, ado };
  }
}
