/**
 * Tab 2 — Review (Section 2):
 *   1. What tools or features are touched
 *   2. Compliance process
 *   3. What the update fixes
 *   4. What is deprecated
 * Editable by roles with EDIT_REVIEW; read-only otherwise.
 */
import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';

const FIELDS = [
  ['tools_touched', 'What tools or features are touched'],
  ['compliance_process', 'Compliance process'],
  ['what_it_fixes', 'What the update fixes'],
  ['what_deprecated', 'What is deprecated'],
];

export function ReviewPanel({ ticket, onSaved }) {
  const { can } = useAuth();
  const editable = can(CAP.EDIT_REVIEW);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // Hydrate from the loaded ticket's review whenever the selection changes.
  useEffect(() => {
    const r = ticket?.review ?? {};
    setForm({
      tools_touched: r.tools_touched ?? '',
      compliance_process: r.compliance_process ?? '',
      what_it_fixes: r.what_it_fixes ?? '',
      what_deprecated: r.what_deprecated ?? '',
    });
    setStatus('');
  }, [ticket?.id]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true); setStatus('');
    try {
      await api.put(`/tickets/${ticket.id}/review`, form);
      setStatus('Saved ✔');
      onSaved?.();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <h2>Review — {ticket.snow_ticket_number || `Ticket #${ticket.id}`}</h2>
      {FIELDS.map(([key, label]) => (
        <div key={key}>
          <label>{label}</label>
          <textarea value={form[key] ?? ''} onChange={update(key)} disabled={!editable} />
        </div>
      ))}
      {editable ? (
        <div className="between">
          <button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save review'}</button>
          <small>{status}</small>
        </div>
      ) : (
        <small>Your role has read-only access to the review section.</small>
      )}
    </div>
  );
}
