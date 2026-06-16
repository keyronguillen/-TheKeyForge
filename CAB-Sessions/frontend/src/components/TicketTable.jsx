/**
 * Tab 1 — the CAB table (Section 1). Shows all nine required columns and lets a
 * user pick a row to drive Tabs 2 & 3. "New CAB ticket" is gated by capability.
 */
import { useState } from 'react';
import { useAuth, CAP } from '../auth/AuthContext.jsx';
import { TicketForm } from './TicketForm.jsx';

const fmt = (d) => (d ? String(d).slice(0, 10) : '—');

export function TicketTable({ tickets, selectedId, onSelect, onCreated, title = 'CAB tickets', allowCreate = true }) {
  const { can } = useAuth();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="stack">
      <div className="between">
        <h2 style={{ margin: 0 }}>{title}</h2>
        {allowCreate && can(CAP.MANAGE_TICKETS) && (
          <button onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : '+ New CAB ticket'}
          </button>
        )}
      </div>

      {showForm && (
        <TicketForm onCreated={(t) => { setShowForm(false); onCreated(t); }} />
      )}

      {tickets.length === 0 ? (
        <div className="empty">No CAB tickets yet.</div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Requestor</th>
                <th>Requested</th>
                <th>UAT</th>
                <th>Prod</th>
                <th>Assigned</th>
                <th>SNOW CR</th>
                <th>ADO Feature</th>
                <th>SNOW Description</th>
                <th>ADO Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className={t.id === selectedId ? 'selected' : ''}
                  onClick={() => onSelect(t.id)}
                >
                  <td>{t.requestor}</td>
                  <td>{fmt(t.requested_date)}</td>
                  <td>{fmt(t.uat_proposed_date)}</td>
                  <td>{fmt(t.prod_proposed_date)}</td>
                  <td>{t.assignee || '—'}</td>
                  <td>{t.snow_ticket_number || '—'}</td>
                  <td>{t.ado_ticket_number || '—'}</td>
                  <td title={t.snow_description}>{truncate(t.snow_description)}</td>
                  <td title={t.ado_description}>{truncate(t.ado_description)}</td>
                  <td><span className={`chip ${t.decision || t.status}`}>{label(t)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <small>Tip: select a row, then open the <strong>Review</strong> and <strong>Approval</strong> tabs.</small>
    </div>
  );
}

const truncate = (s, n = 48) => (!s ? '—' : s.length > n ? `${s.slice(0, n)}…` : s);

function label(t) {
  if (t.decision && t.decision !== 'pending') {
    return { approved: 'Approved', rejected: 'Rejected', to_be_reviewed: 'To review' }[t.decision] ?? t.decision;
  }
  return { new: 'New', in_review: 'In review', decided: 'Decided' }[t.status] ?? t.status;
}
