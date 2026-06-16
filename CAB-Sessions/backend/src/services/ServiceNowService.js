/**
 * ServiceNow read-only client (REST Table API).
 *
 * Reads Change Requests (the CAB source on the ServiceNow side) from the
 * configured instance. Auth is HTTP Basic with the instance user/password,
 * which live only on the backend (config/env), never in the browser.
 * Self-disables when not configured.
 *
 * `sysparm_display_value=true` returns human-readable values (state names,
 * assignee display name) instead of raw sys_ids.
 */
import { config, isSnowEnabled } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const FIELDS = ['sys_id', 'number', 'short_description', 'description', 'state', 'assigned_to', 'risk', 'type'];

export class ServiceNowService {
  get enabled() {
    return isSnowEnabled;
  }

  #ensureEnabled() {
    if (!isSnowEnabled) {
      throw new AppError(503, 'ServiceNow is not configured. Set SNOW_INSTANCE_URL, SNOW_USER and SNOW_PASSWORD on the server.');
    }
  }

  #authHeader() {
    const token = Buffer.from(`${config.snow.user}:${config.snow.pass}`).toString('base64');
    return `Basic ${token}`;
  }

  async #request(url) {
    const res = await fetch(url, {
      headers: { Authorization: this.#authHeader(), Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // 401 = bad creds; PDIs also hibernate (then the host is unreachable / 5xx).
      throw new AppError(res.status === 401 ? 401 : res.status,
        `ServiceNow request failed (${res.status}). Check credentials, table access, or wake the instance.`,
        body ? { snow: body.slice(0, 300) } : undefined);
    }
    return res.json();
  }

  /** List recent Change Requests. @returns {Promise<Array<{sysId,number,title,description,state,assignedTo,risk}>>} */
  async listChanges({ limit = 100 } = {}) {
    this.#ensureEnabled();
    const { instanceUrl, table } = config.snow;
    const params = new URLSearchParams({
      sysparm_limit: String(limit),
      sysparm_display_value: 'true',
      sysparm_exclude_reference_link: 'true',
      sysparm_fields: FIELDS.join(','),
      sysparm_query: 'ORDERBYDESCsys_created_on',
    });
    const url = `${instanceUrl}/api/now/table/${table}?${params}`;
    const data = await this.#request(url);
    return (data.result ?? []).map((r) => this.#map(r));
  }

  /** Fetch one record by sys_id (used when importing into a CAB ticket). */
  async getChange(sysId) {
    this.#ensureEnabled();
    const { instanceUrl, table } = config.snow;
    const params = new URLSearchParams({
      sysparm_display_value: 'true',
      sysparm_exclude_reference_link: 'true',
      sysparm_fields: FIELDS.join(','),
    });
    const url = `${instanceUrl}/api/now/table/${table}/${encodeURIComponent(sysId)}?${params}`;
    const data = await this.#request(url);
    if (!data.result) throw AppError.notFound('ServiceNow record not found.');
    return this.#map(data.result);
  }

  #map(r) {
    return {
      sysId: r.sys_id,
      number: r.number,
      title: r.short_description ?? '',
      description: r.description ?? '',
      state: r.state ?? '',
      assignedTo: r.assigned_to || null, // display value (name) or '' when unassigned
      risk: r.risk ?? '',
    };
  }
}
