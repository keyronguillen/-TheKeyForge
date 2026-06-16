/** Approval HTTP controller (Tab 3). Scoped to req.projectId. */
import { ApprovalService } from '../services/ApprovalService.js';

const approvals = new ApprovalService();

export class ApprovalController {
  static async decide(req, res) {
    const result = await approvals.decide(Number(req.params.id), req.body, req.user, req.projectId);
    res.json(result);
  }
}
