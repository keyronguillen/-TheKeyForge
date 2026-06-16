/**
 * ServiceNow (live) view — lists Change Requests from the connected instance and
 * lets a user import one into the current project's CAB board. Read-only against
 * ServiceNow; importing creates a CAB ticket (snow_ticket_number set).
 */
import { useEffect, useState, useCallback } from 'react';
import { snow } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';

export function SnowView({ project, onImported, onToast }) {
  const { can } = useAuth();
  const canImport = can(CAP.MANAGE_TICKETS);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { changes } = await snow.changes();
      setItems(changes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doImport = async (sysId, number) => {
    setBusyId(sysId);
    try {
      await snow.import(sysId);
      onToast?.(`Imported ${number} into ${project} CAB`);
      onImported?.();
    } catch (err) {
      onToast?.(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ margin: 0 }}>ServiceNow — Change Requests</h2>
        <button className="ghost small" onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="empty">Loading Change Requests from ServiceNow…</div>
      ) : items.length === 0 ? (
        <div className="empty">No Change Requests found. Create some in ServiceNow (table change_request).</div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Number</th><th>Short description</th><th>State</th><th>Risk</th><th>Assigned</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.sysId}>
                  <td>{c.number}</td>
                  <td>{c.title || '—'}</td>
                  <td><span className="chip in_review">{c.state || '—'}</span></td>
                  <td>{c.risk || '—'}</td>
                  <td>{c.assignedTo || '—'}</td>
                  <td>
                    {canImport && (
                      <button className="small" disabled={busyId === c.sysId} onClick={() => doImport(c.sysId, c.number)}>
                        {busyId === c.sysId ? '…' : 'Import → CAB'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <small>Read-only from ServiceNow. Importing creates a CAB ticket linked to the Change Request.</small>
    </div>
  );
}
