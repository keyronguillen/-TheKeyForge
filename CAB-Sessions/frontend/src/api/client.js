/**
 * Tiny fetch wrapper. Attaches the JWT, parses JSON, and throws a normalized
 * error so calling code can show `err.message`. One place to change transport
 * concerns (base URL, auth header, error shape) — DRY.
 */
const TOKEN_KEY = 'cab.token';

// Base URL of the backend API.
//   - Local dev: empty string → calls "/api/..." and Vite proxies to :4000.
//   - Production (Vercel): set VITE_API_URL to the Render backend URL so the
//     SPA calls the API directly (no proxy exists in production).
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

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
