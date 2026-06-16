/**
 * Tiny fetch wrapper. Attaches the JWT + active project, parses JSON, and throws
 * a normalized error so calling code can show `err.message`. One place to change
 * transport concerns (base URL, auth header, tenant header, error shape) — DRY.
 */
const TOKEN_KEY = 'cab.token';
const PROJECT_KEY = 'cab.projectId';

// Base URL of the backend API.
//   - Local dev: empty string → calls "/api/..." and Vite proxies to :4000.
//   - Production (Vercel): VITE_API_URL points at the Render backend.
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Active project (tenant) — sent as X-Project-Id on every scoped request. */
export const projectStore = {
  get: () => {
    const v = localStorage.getItem(PROJECT_KEY);
    return v ? Number(v) : null;
  },
  set: (id) => localStorage.setItem(PROJECT_KEY, String(id)),
  clear: () => localStorage.removeItem(PROJECT_KEY),
};

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const projectId = projectStore.get();
  if (projectId) headers['X-Project-Id'] = String(projectId);

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = data.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};

/** AI assistant calls (Claude, server-side). */
export const ai = {
  status: () => request('GET', '/ai/status'),
  draftReview: (ticketId) => request('POST', `/tickets/${ticketId}/ai/draft-review`),
  feedback: (ticketId) => request('POST', `/tickets/${ticketId}/ai/feedback`),
  report: () => request('POST', '/ai/cab-report'),
};

/** Azure DevOps (Azure Boards) calls, server-side via PAT. */
export const ado = {
  status: () => request('GET', '/ado/status'),
  workItems: () => request('GET', '/ado/workitems'),
  import: (id) => request('POST', `/ado/import/${id}`),
};
