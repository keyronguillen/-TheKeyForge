/** Top bar + page container shown around authenticated pages. */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, CAP } from '../auth/AuthContext.jsx';
import { useProject } from '../project/ProjectContext.jsx';

export function AppShell({ children }) {
  const { user, logout, can } = useAuth();
  const { active, projects, clearProject } = useProject();
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate('/login'); };

  // "Switch project" returns to the picker (only meaningful with >1 project).
  const switchProject = () => { clearProject(); navigate('/'); };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" style={{ margin: 0 }}>
          <div className="logo" />
          <strong>CAB-Sessions</strong>
        </div>
        <div className="user">
          {active && (
            <span className="project-chip" title={`${active.company} · ${active.name}`}>
              🏢 {active.company} · {active.name}
              {projects.length > 1 && (
                <button className="muted-link" style={{ marginLeft: '.5rem' }} onClick={switchProject}>switch</button>
              )}
            </span>
          )}
          <Link to="/">Board</Link>
          {can(CAP.MANAGE_USERS) && <Link to="/admin">Admin</Link>}
          <span className="role-pill">{user?.role}</span>
          <span>{user?.fullName}</span>
          <button className="ghost small" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
