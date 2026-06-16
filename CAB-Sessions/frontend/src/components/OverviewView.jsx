/**
 * Overview (side-menu step 1): count cards + a compact list of the tickets in
 * each bucket. Clicking a ticket jumps to its bucket with that ticket selected.
 */
import { bucketOf } from './buckets.js';

const fmt = (d) => (d ? String(d).slice(0, 10) : '—');

function MiniList({ title, tickets, onOpen }) {
  return (
    <div className="card stack">
      <strong>{title} <span className="role-pill">{tickets.length}</span></strong>
      {tickets.length === 0
        ? <small>None.</small>
        : tickets.slice(0, 6).map((t) => (
            <button key={t.id} className="mini-row" onClick={() => onOpen(t)}>
              <span>{t.snow_ticket_number || `#${t.id}`} · {t.requestor}</span>
              <small>{fmt(t.requested_date)}</small>
            </button>
          ))}
    </div>
  );
}

export function OverviewView({ tickets, counts, onOpen, projectName }) {
  const present = tickets.filter((t) => bucketOf(t) === 'present');
  const approved = tickets.filter((t) => bucketOf(t) === 'approved');
  const declined = tickets.filter((t) => bucketOf(t) === 'declined');

  const cards = [
    ['Total', counts?.total ?? tickets.length, 'chip new'],
    ['To present', counts?.to_present ?? present.length, 'chip in_review'],
    ['Approved', counts?.approved ?? approved.length, 'chip approved'],
    ['Declined / Review', counts?.declined ?? declined.length, 'chip rejected'],
  ];

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>{projectName} — Overview</h2>
      <div className="row">
        {cards.map(([label, value]) => (
          <div className="card center" key={label}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{value}</div>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <MiniList title="To present" tickets={present} onOpen={(t) => onOpen('present', t)} />
        <MiniList title="Approved" tickets={approved} onOpen={(t) => onOpen('approved', t)} />
        <MiniList title="Declined / To review" tickets={declined} onOpen={(t) => onOpen('declined', t)} />
      </div>
    </div>
  );
}
