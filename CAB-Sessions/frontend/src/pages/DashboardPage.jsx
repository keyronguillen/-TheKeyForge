/**
 * The CAB workspace. Holds the ticket list + selected ticket and renders the
 * three tabs (Section 2). Live-updates via Socket.IO so every participant sees
 * the same board during the meeting.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, ai } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';
import { useRealtime } from '../realtime/useRealtime.js';
import { TicketTable } from '../components/TicketTable.jsx';
import { ReviewPanel } from '../components/ReviewPanel.jsx';
import { ApprovalPanel } from '../components/ApprovalPanel.jsx';
import { CabReportModal } from '../components/CabReportModal.jsx';

const TABS = [
  { id: 'tickets', label: '1 · Tickets' },
  { id: 'review', label: '2 · Review' },
  { id: 'approval', label: '3 · Approval' },
];

export default function DashboardPage() {
  const { can } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('tickets');
  const [toast, setToast] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [report, setReport] = useState(null);          // { text } | null (modal)
  const [reportBusy, setReportBusy] = useState(false);

  const loadTickets = useCallback(async () => {
    const { tickets } = await api.get('/tickets');
    setTickets(tickets);
    return tickets;
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    const { ticket } = await api.get(`/tickets/${id}`);
    setDetail(ticket);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);
  // Probe whether the AI assistant is configured on the backend.
  useEffect(() => { ai.status().then((s) => setAiEnabled(s.enabled)).catch(() => setAiEnabled(false)); }, []);

  const generateReport = async () => {
    setReportBusy(true);
    try {
      const { report } = await ai.report();
      setReport(report);
    } catch (err) {
      showToast(err.message);
    } finally {
      setReportBusy(false);
    }
  };

  // Real-time: refresh the board (and the open ticket) on any change.
  const onRealtime = useCallback(() => {
    loadTickets();
    if (selectedId) loadDetail(selectedId);
  }, [loadTickets, loadDetail, selectedId]);
  useRealtime(onRealtime);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const refreshAll = async () => { await loadTickets(); await loadDetail(selectedId); };

  return (
    <div>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <nav className="tabs" style={{ flex: 1 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              disabled={t.id !== 'tickets' && !selectedId}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {aiEnabled && can(CAP.USE_AI) && (
          <button className="ghost small" onClick={generateReport} disabled={reportBusy}
            style={{ marginBottom: '.4rem' }}>
            {reportBusy ? 'Generating…' : '📄 AI CAB report'}
          </button>
        )}
      </div>

      {tab === 'tickets' && (
        <TicketTable
          tickets={tickets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={() => loadTickets()}
        />
      )}

      {tab === 'review' && (
        detail
          ? <ReviewPanel ticket={detail} onSaved={refreshAll} aiEnabled={aiEnabled} />
          : <div className="empty">Select a ticket on the Tickets tab first.</div>
      )}

      {tab === 'approval' && (
        detail
          ? <ApprovalPanel ticket={detail} onDecided={refreshAll} onToast={showToast} />
          : <div className="empty">Select a ticket on the Tickets tab first.</div>
      )}

      {/* Helper so users discover the row→tab flow */}
      {tab === 'tickets' && (
        <p style={{ marginTop: '.75rem' }}>
          <small>Selecting a row opens its <strong>Review</strong> and <strong>Approval</strong> tabs.</small>
        </p>
      )}

      {toast && <div className="toast">{toast}</div>}
      {report && <CabReportModal text={report} onClose={() => setReport(null)} />}
    </div>
  );
}
