/**
 * Admin area (Section 3): full control. Manage user roles, view the audit log,
 * and exercise GDPR erasure. Reachable only by the Admin role (route-gated).
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [audit, setAudit] = useState([]);
  const [view, setView] = useState('users');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([api.get('/admin/users'), api.get('/admin/audit')]);
      setUsers(u.users); setRoles(u.roles); setAudit(a.entries);
    } catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (id, role) => {
    await api.put(`/admin/users/${id}/role`, { role });
    load();
  };

  const erase = async (id, name) => {
    if (!window.confirm(`GDPR erase "${name}"? This anonymizes their PII and disables the account.`)) return;
    await api.del(`/admin/users/${id}`);
    load();
  };

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ margin: 0 }}>Administration</h2>
        <div className="tabs" style={{ border: 'none', margin: 0 }}>
          <button className={`tab ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>Users &amp; roles</button>
          <button className={`tab ${view === 'audit' ? 'active' : ''}`} onClick={() => setView('audit')}>Audit log</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}

      {view === 'users' && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>MFA</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} disabled={!u.is_active}>
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>{u.mfa_enabled ? '✔' : '—'}</td>
                  <td>{u.is_active ? '✔' : '—'}</td>
                  <td>
                    <button className="danger small" disabled={!u.is_active} onClick={() => erase(u.id, u.full_name)}>
                      GDPR erase
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'audit' && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {audit.map((e) => (
                <tr key={e.id}>
                  <td>{e.created_at}</td>
                  <td>{e.actor_name || `#${e.actor_id ?? '—'}`}</td>
                  <td>{e.action}</td>
                  <td>{e.entity}{e.entity_id ? ` #${e.entity_id}` : ''}</td>
                  <td title={e.detail}>{e.detail ? `${String(e.detail).slice(0, 60)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
