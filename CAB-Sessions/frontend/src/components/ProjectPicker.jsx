/**
 * Post-login project picker. Shows the clients/projects the user belongs to,
 * grouped by company. Selecting one enters that project's isolated CAB board.
 */
import { useProject } from '../project/ProjectContext.jsx';

export function ProjectPicker() {
  const { projects, loading, selectProject } = useProject();

  if (loading) return <div className="empty">Loading your projects…</div>;

  if (projects.length === 0) {
    return (
      <div className="empty">
        You are not a member of any project yet.<br />
        <small>Ask an Admin to add you to a company project.</small>
      </div>
    );
  }

  // Group by company name for a clean, professional list.
  const byCompany = projects.reduce((acc, p) => {
    (acc[p.company] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ maxWidth: 520 }}>
        <div className="brand"><div className="logo" /><strong>CAB-Sessions</strong></div>
        <h2>Choose a project</h2>
        <small>Each client/project is isolated — pick the one you want to work in.</small>
        <div className="stack" style={{ marginTop: '1rem' }}>
          {Object.entries(byCompany).map(([company, list]) => (
            <div key={company}>
              <label style={{ marginTop: '.5rem' }}>{company}</label>
              {list.map((p) => (
                <button
                  key={p.id}
                  className="ghost"
                  style={{ width: '100%', textAlign: 'left', marginBottom: '.4rem' }}
                  onClick={() => selectProject(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
