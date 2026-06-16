/**
 * Azure DevOps (Azure Boards) read-only client.
 *
 * Pulls Epics / Features / Tasks from the configured project using the REST API:
 *   1. WIQL query → list of work item IDs
 *   2. batch GET → the fields we display
 *
 * Auth is a Personal Access Token (PAT) sent as HTTP Basic ("" : PAT). The PAT
 * lives only on the backend (config/env), never in the browser. Self-disables
 * when not configured.
 *
 * GDPR/security note: only the fields needed for the CAB board are requested;
 * the PAT must be scoped to Work Items (Read) and rotated on exposure.
 */
import { config, isAdoEnabled } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const API_VERSION = '7.0';

export class AzureDevOpsService {
  get enabled() {
    return isAdoEnabled;
  }

  #ensureEnabled() {
    if (!isAdoEnabled) {
      throw new AppError(503, 'Azure DevOps is not configured. Set ADO_ORG_URL, ADO_PROJECT and ADO_PAT on the server.');
    }
  }

  #authHeader() {
    // Basic auth with an empty username and the PAT as the password.
    const token = Buffer.from(`:${config.ado.pat}`).toString('base64');
    return `Basic ${token}`;
  }

  async #request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.#authHeader(),
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Surface a clean message; 203 from ADO usually means a bad/expired PAT.
      throw new AppError(res.status === 203 ? 401 : res.status,
        `Azure DevOps request failed (${res.status}). Check the PAT scope/expiry.`,
        body ? { ado: body.slice(0, 300) } : undefined);
    }
    return res.json();
  }

  /**
   * List recent work items of the configured types for the project.
   * @returns {Promise<Array<{id,type,title,state,assignedTo,url}>>}
   */
  async listWorkItems({ limit = 100 } = {}) {
    this.#ensureEnabled();
    const { orgUrl, project, types } = config.ado;
    const typeList = types.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');

    // 1) WIQL → IDs (WIQL returns ids only).
    const wiql = {
      query: `SELECT [System.Id] FROM workitems
              WHERE [System.TeamProject] = @project
                AND [System.WorkItemType] IN (${typeList})
              ORDER BY [System.ChangedDate] DESC`,
    };
    const wiqlUrl = `${orgUrl}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=${API_VERSION}`;
    const wiqlRes = await this.#request(wiqlUrl, { method: 'POST', body: JSON.stringify(wiql) });
    const ids = (wiqlRes.workItems ?? []).slice(0, limit).map((w) => w.id);
    if (ids.length === 0) return [];

    // 2) batch GET the fields we render (org-level endpoint, chunked to 200).
    const fields = ['System.Id', 'System.WorkItemType', 'System.Title', 'System.State', 'System.AssignedTo'];
    const out = [];
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const batchUrl = `${orgUrl}/_apis/wit/workitemsbatch?api-version=${API_VERSION}`;
      const batch = await this.#request(batchUrl, {
        method: 'POST',
        body: JSON.stringify({ ids: chunk, fields }),
      });
      for (const wi of batch.value ?? []) {
        const f = wi.fields ?? {};
        out.push({
          id: wi.id,
          type: f['System.WorkItemType'] ?? '',
          title: f['System.Title'] ?? '',
          state: f['System.State'] ?? '',
          assignedTo: f['System.AssignedTo']?.displayName ?? null,
          url: `${orgUrl}/${encodeURIComponent(project)}/_workitems/edit/${wi.id}`,
        });
      }
    }
    return out;
  }

  /** Fetch one work item's full fields (used when importing into a CAB ticket). */
  async getWorkItem(id) {
    this.#ensureEnabled();
    const { orgUrl } = config.ado;
    const url = `${orgUrl}/_apis/wit/workitems/${Number(id)}?api-version=${API_VERSION}`;
    const wi = await this.#request(url);
    const f = wi.fields ?? {};
    return {
      id: wi.id,
      type: f['System.WorkItemType'] ?? '',
      title: f['System.Title'] ?? '',
      state: f['System.State'] ?? '',
      assignedTo: f['System.AssignedTo']?.displayName ?? null,
      description: stripHtml(f['System.Description'] ?? ''),
    };
  }
}

/** ADO descriptions are HTML; reduce to plain-ish text for our CAB fields. */
function stripHtml(html) {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
