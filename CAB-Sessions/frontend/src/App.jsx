/**
 * Route map + auth gating. Unauthenticated users are sent to /login; the
 * dashboard and admin area require a session.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, CAP } from './auth/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { AppShell } from './components/AppShell.jsx';

/** Gate that requires an authenticated session (and optionally a capability). */
function Protected({ children, capability }) {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (capability && !can(capability)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      <Route
        path="/"
        element={<Protected><AppShell><DashboardPage /></AppShell></Protected>}
      />
      <Route
        path="/admin"
        element={(
          <Protected capability={CAP.MANAGE_USERS}>
            <AppShell><AdminPage /></AppShell>
          </Protected>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
