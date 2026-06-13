/**
 * Tab 3 — Approval process (Section 2):
 *   - decision dropdown (approved / reject / to be reviewed)
 *   - email notification of the status
 *   - decision timestamp
 *   - update tickets on ServiceNow & ADO (dropdown-driven, stubbed integration)
 * Gated by the DECIDE capability; integration push by PUSH_INTEGRATION.
 */
import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';

const OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'to_be_reviewed', label: 'To be reviewed' },
];

export function ApprovalPanel({ ticket, onDecided, onToast }) {
  const { can } = useAuth();
  const canDecide = can(CAP.DECIDE);
  const canPush = can(CAP.PUSH_INTEGRATION);

  const current = ticket.approval ?? {};
  const [decision, setDecision] = useState(current.decision && current.decision !== 'pending' ? current.decision : 'approved');
  const [comment, setComment] = useState(current.comment ?? '');
  const [notify, setNotify] = useState(true);
  const [pushIntegration, setPushIntegration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const c = ticket.approval ?? {};
    setDecision(c.decision && c.decision !== 'pending' ? c.decision : 'approved');
    setComment(c.comment ?? '');
    setError('');
  }, [ticket?.id]);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const result = await api.post(`/tickets/${ticket.id}/decision`, {
        decision, comment, notify, pushIntegration: pushIntegration && canPush,
      });
      const parts = [`Decision saved: ${decision.replace(/_/g, ' ')}`];
      if (result.notification?.sent) parts.push(`email → ${result.notification.to}`);
      if (result.integration) parts.push('pushed to ServiceNow & ADO');
      onToast?.(parts.join(' · '));
      onDecided?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <h2>Approval — {ticket.snow_ticket_number || `Ticket #${ticket.id}`}</h2>

      {/* Current state summary */}
      <div className="kv">
        <dt>Current decision</dt>
        <dd><span className={`chip ${current.decision || 'pending'}`}>{(current.decision || 'pending').replace(/_/g, ' ')}</span></dd>
        <dt>Decided at</dt>
        <dd>{current.decided_at || '—'}</dd>
        <dt>Notified</dt>
        <dd>{current.notified ? 'Yes' : 'No'}</dd>
        <dt>Pushed to SNOW/ADO</dt>
        <dd>{current.integration_pushed ? 'Yes' : 'No'}</dd>
      </div>

      {!canDecide ? (
        <small>Your role can view the approval status but cannot make a decision.</small>
      ) : (
        <>
          <div className="grid-2">
            <div>
              <label>Decision</label>
              <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label>Decided at</label>
              <input value="Stamped automatically on save" disabled />
            </div>
          </div>

          <label>Comment</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional notes for the record / email" />

          <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginTop: '.5rem' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Email the decision to the requestor/assignee
          </label>

          <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }} title={canPush ? '' : 'Your role cannot push to ServiceNow/ADO'}>
            <input type="checkbox" style={{ width: 'auto' }} checked={pushIntegration} disabled={!canPush}
              onChange={(e) => setPushIntegration(e.target.checked)} />
            Update tickets on ServiceNow &amp; Azure DevOps
          </label>

          {error && <div className="error">{error}</div>}
          <button onClick={submit} disabled={busy} style={{ marginTop: '.5rem' }}>
            {busy ? 'Saving…' : 'Record decision'}
          </button>
        </>
      )}
    </div>
  );
}
