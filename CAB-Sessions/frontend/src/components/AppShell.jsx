/** Top bar + page container shown around authenticated pages. */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, CAP } from '../auth/AuthContext.jsx';

export function AppShell({ children }) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" style={{ margin: 0 }}>
          <div className="logo" />
          <strong>CAB-Sessions</strong>
        </div>
        <div className="user">
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
