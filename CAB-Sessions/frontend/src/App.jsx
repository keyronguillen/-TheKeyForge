/**
 * Route map + auth gating. Authenticated areas are wrapped in ProjectProvider so
 * the active project (tenant) is available to the shell and the workspace.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, CAP } from './auth/AuthContext.jsx';
import { ProjectProvider } from './project/ProjectContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { AppShell } from './components/AppShell.jsx';

/** Gate that requires an authenticated session (and optionally a capability). */
function Protected({ children, capability }) {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (capability && !can(capability)) return <Navigate to="/" replace />;
  return (
    <ProjectProvider>
      <AppShell>{children}</AppShell>
    </ProjectProvider>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      <Route path="/" element={<Protected><WorkspacePage /></Protected>} />
      <Route
        path="/admin"
        element={<Protected capability={CAP.MANAGE_USERS}><AdminPage /></Protected>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
