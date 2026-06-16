/**
 * Azure Boards (live) view — lists Epics/Features/Tasks from the connected ADO
 * project and lets a user import one into the current project's CAB board.
 * Read-only against ADO; importing creates a CAB ticket (ado_ticket_number set).
 */
import { useEffect, useState, useCallback } from 'react';
import { ado } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';

const typeChip = { Epic: 'rejected', Feature: 'in_review', Task: 'new' };

export function AdoView({ project, onImported, onToast }) {
  const { can } = useAuth();
  const canImport = can(CAP.MANAGE_TICKETS);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { workItems } = await ado.workItems();
      setItems(workItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doImport = async (id) => {
    setBusyId(id);
    try {
      await ado.import(id);
      onToast?.(`Imported AB#${id} into ${project} CAB`);
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
        <h2 style={{ margin: 0 }}>Azure Boards — live</h2>
        <button className="ghost small" onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="empty">Loading work items from Azure DevOps…</div>
      ) : items.length === 0 ? (
        <div className="empty">No Epics/Features/Tasks found in the ADO project.</div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>ID</th><th>Type</th><th>Title</th><th>State</th><th>Assigned</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>AB#{w.id}</td>
                  <td><span className={`chip ${typeChip[w.type] || 'new'}`}>{w.type}</span></td>
                  <td><a href={w.url} target="_blank" rel="noreferrer">{w.title}</a></td>
                  <td>{w.state}</td>
                  <td>{w.assignedTo || '—'}</td>
                  <td>
                    {canImport && (
                      <button className="small" disabled={busyId === w.id} onClick={() => doImport(w.id)}>
                        {busyId === w.id ? '…' : 'Import → CAB'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <small>Read-only from Azure DevOps. Importing creates a CAB ticket linked to the work item.</small>
    </div>
  );
}
