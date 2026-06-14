/**
 * Tab 2 — Review (Section 2):
 *   1. What tools or features are touched
 *   2. Compliance process
 *   3. What the update fixes
 *   4. What is deprecated
 * Editable by roles with EDIT_REVIEW; read-only otherwise.
 *
 * AI assistant (Claude Haiku) — for roles with USE_AI and when the backend has a
 * key configured:
 *   • "Draft with AI" pre-fills the four fields (user reviews, then saves).
 *   • "Generate feedback" produces risks/questions/recommendation, persisted on
 *     the ticket and shown below.
 */
import { useState, useEffect } from 'react';
import { api, ai } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';

const FIELDS = [
  ['tools_touched', 'What tools or features are touched'],
  ['compliance_process', 'Compliance process'],
  ['what_it_fixes', 'What the update fixes'],
  ['what_deprecated', 'What is deprecated'],
];

export function ReviewPanel({ ticket, onSaved, aiEnabled }) {
  const { can } = useAuth();
  const editable = can(CAP.EDIT_REVIEW);
  const canUseAi = aiEnabled && can(CAP.USE_AI);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState('');           // '' | 'draft' | 'feedback'
  const [feedback, setFeedback] = useState('');
  const [aiError, setAiError] = useState('');

  // Hydrate from the loaded ticket's review whenever the selection changes.
  useEffect(() => {
    const r = ticket?.review ?? {};
    setForm({
      tools_touched: r.tools_touched ?? '',
      compliance_process: r.compliance_process ?? '',
      what_it_fixes: r.what_it_fixes ?? '',
      what_deprecated: r.what_deprecated ?? '',
    });
    setFeedback(r.ai_feedback ?? '');
    setStatus(''); setAiError('');
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

  // AI: draft the four fields and drop them into the form (not yet saved).
  const draft = async () => {
    setAiBusy('draft'); setAiError('');
    try {
      const { fields } = await ai.draftReview(ticket.id);
      setForm((f) => ({ ...f, ...fields }));
      setStatus('AI draft inserted — review and Save.');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy('');
    }
  };

  // AI: generate reviewer feedback (persisted server-side onto the ticket).
  const genFeedback = async () => {
    setAiBusy('feedback'); setAiError('');
    try {
      const res = await ai.feedback(ticket.id);
      setFeedback(res.feedback);
      onSaved?.();
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiBusy('');
    }
  };

  return (
    <div className="card stack">
      <div className="between">
        <h2 style={{ margin: 0 }}>Review — {ticket.snow_ticket_number || `Ticket #${ticket.id}`}</h2>
        {canUseAi && (
          <div className="stack" style={{ flexDirection: 'row', gap: '.5rem' }}>
            {editable && (
              <button className="ghost small" onClick={draft} disabled={!!aiBusy}>
                {aiBusy === 'draft' ? 'Drafting…' : '✨ Draft with AI'}
              </button>
            )}
            <button className="ghost small" onClick={genFeedback} disabled={!!aiBusy}>
              {aiBusy === 'feedback' ? 'Thinking…' : '🧠 AI feedback'}
            </button>
          </div>
        )}
      </div>

      {aiError && <div className="error">{aiError}</div>}

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

      {feedback && (
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <div className="between">
            <strong>🧠 AI feedback</strong>
            {ticket.review?.ai_generated_at && <small>generated {ticket.review.ai_generated_at}</small>}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '.9rem', marginTop: '.5rem' }}>{feedback}</div>
        </div>
      )}

      {!aiEnabled && can(CAP.USE_AI) && (
        <small>AI assistant is off — set <code>ANTHROPIC_API_KEY</code> on the server to enable it.</small>
      )}
    </div>
  );
}
