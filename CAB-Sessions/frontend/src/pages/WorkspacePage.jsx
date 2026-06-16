/**
 * The CAB workspace for the active project. Renders the project picker until a
 * project is chosen, then a left side menu (Section 5) with four views:
 * Overview / To present / Approved / Declined-Review. Data is always scoped to
 * the active project (the API sends X-Project-Id); live-updates via Socket.IO.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, ai, ado } from '../api/client.js';
import { useAuth, CAP } from '../auth/AuthContext.jsx';
import { useProject } from '../project/ProjectContext.jsx';
import { useRealtime } from '../realtime/useRealtime.js';
import { ProjectPicker } from '../components/ProjectPicker.jsx';
import { Sidebar } from '../components/Sidebar.jsx';
import { OverviewView } from '../components/OverviewView.jsx';
import { BucketView } from '../components/BucketView.jsx';
import { AdoView } from '../components/AdoView.jsx';
import { CabReportModal } from '../components/CabReportModal.jsx';
import { bucketOf } from '../components/buckets.js';

export default function WorkspacePage() {
  const { can } = useAuth();
  const { active, activeId } = useProject();

  const [view, setView] = useState('overview');     // overview | present | approved | declined
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [adoEnabled, setAdoEnabled] = useState(false);
  const [report, setReport] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const loadBoard = useCallback(async () => {
    if (!activeId) return;
    const [{ tickets }, { counts }] = await Promise.all([
      api.get('/tickets'),
      api.get('/tickets/counts'),
    ]);
    setTickets(tickets);
    setCounts(counts);
  }, [activeId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    const { ticket } = await api.get(`/tickets/${id}`);
    setDetail(ticket);
  }, []);

  // Reset + reload whenever the active project changes.
  useEffect(() => {
    setSelectedId(null); setDetail(null); setView('overview');
    loadBoard().catch((e) => showToast(e.message));
  }, [activeId, loadBoard]);

  useEffect(() => { loadDetail(selectedId).catch(() => {}); }, [selectedId, loadDetail]);

  useEffect(() => { ai.status().then((s) => setAiEnabled(s.enabled)).catch(() => setAiEnabled(false)); }, []);
  useEffect(() => { ado.status().then((s) => setAdoEnabled(s.enabled)).catch(() => setAdoEnabled(false)); }, []);

  // Live refresh on any board change (only matters for the active project).
  const onRealtime = useCallback((payload) => {
    if (payload?.project_id && payload.project_id !== activeId) return;
    loadBoard();
    if (selectedId) loadDetail(selectedId);
  }, [loadBoard, loadDetail, selectedId, activeId]);
  useRealtime(onRealtime);

  const refreshAll = async () => { await loadBoard(); await loadDetail(selectedId); };

  const openFromOverview = (bucket, ticket) => { setView(bucket); setSelectedId(ticket.id); };

  const generateReport = async () => {
    setReportBusy(true);
    try { setReport((await ai.report()).report); }
    catch (err) { showToast(err.message); }
    finally { setReportBusy(false); }
  };

  if (!active) return <ProjectPicker />;

  const inBucket = (b) => tickets.filter((t) => bucketOf(t) === b);

  return (
    <div className="workspace">
      <Sidebar active={view} onSelect={(v) => { setView(v); setSelectedId(null); }} counts={counts} adoEnabled={adoEnabled} />

      <main className="work-main">
        <div className="between" style={{ marginBottom: '.5rem' }}>
          <span className="role-pill">{active.company} · {active.name}</span>
          {aiEnabled && can(CAP.USE_AI) && (
            <button className="ghost small" onClick={generateReport} disabled={reportBusy}>
              {reportBusy ? 'Generating…' : '📄 AI CAB report'}
            </button>
          )}
        </div>

        {view === 'overview' && (
          <OverviewView tickets={tickets} counts={counts} projectName={active.name} onOpen={openFromOverview} />
        )}
        {view === 'ado' && (
          <AdoView project={active.name} onImported={() => { refreshAll(); setView('present'); }} onToast={showToast} />
        )}
        {view !== 'overview' && view !== 'ado' && (
          <BucketView
            bucket={view}
            tickets={inBucket(view)}
            selectedId={selectedId}
            onSelect={setSelectedId}
            detail={detail}
            onChanged={refreshAll}
            onToast={showToast}
            aiEnabled={aiEnabled}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
      {report && <CabReportModal text={report} onClose={() => setReport(null)} />}
    </div>
  );
}
