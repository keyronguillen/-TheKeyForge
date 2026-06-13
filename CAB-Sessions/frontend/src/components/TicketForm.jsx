/** Inline form to create a CAB ticket (Tab 1). Whitelisted fields only. */
import { useState } from 'react';
import { api } from '../api/client.js';

const EMPTY = {
  requestor: '', requestedDate: '', uatProposedDate: '', prodProposedDate: '',
  assignee: '', snowTicketNumber: '', adoTicketNumber: '', snowDescription: '', adoDescription: '',
};

export function TicketForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      // Drop empty optional strings so the server stores NULLs.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== ''),
      );
      const { ticket } = await api.post('/tickets', payload);
      setForm(EMPTY);
      onCreated(ticket);
    } catch (err) {
      setError(err.details?.map((d) => `${d.field}: ${d.message}`).join(' · ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>New CAB ticket</h3>
      <div className="grid-2">
        <div>
          <label>Requestor *</label>
          <input value={form.requestor} onChange={update('requestor')} required />
        </div>
        <div>
          <label>Assigned to</label>
          <input value={form.assignee} onChange={update('assignee')} placeholder="name or email" />
        </div>
        <div>
          <label>Requested date *</label>
          <input type="date" value={form.requestedDate} onChange={update('requestedDate')} required />
        </div>
        <div>
          <label>UAT proposed date</label>
          <input type="date" value={form.uatProposedDate} onChange={update('uatProposedDate')} />
        </div>
        <div>
          <label>Prod proposed date</label>
          <input type="date" value={form.prodProposedDate} onChange={update('prodProposedDate')} />
        </div>
        <div>
          <label>ServiceNow CR #</label>
          <input value={form.snowTicketNumber} onChange={update('snowTicketNumber')} placeholder="CHG00..." />
        </div>
        <div>
          <label>Azure DevOps Feature #</label>
          <input value={form.adoTicketNumber} onChange={update('adoTicketNumber')} placeholder="AB#..." />
        </div>
      </div>
      <label>ServiceNow description</label>
      <textarea value={form.snowDescription} onChange={update('snowDescription')} />
      <label>Azure DevOps description</label>
      <textarea value={form.adoDescription} onChange={update('adoDescription')} />

      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={busy} style={{ marginTop: '.75rem' }}>
        {busy ? 'Saving…' : 'Create ticket'}
      </button>
    </form>
  );
}
