/**
 * Authentication context: holds the current user + JWT, exposes login/logout,
 * and a `can(capability)` helper used throughout the UI to hide/disable
 * controls per the role matrix (Section 3).
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, if we have a token, restore the session profile.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  /** Persist a successful session (token + profile). */
  const establishSession = useCallback(({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  /** Capability check mirrors the backend; UI-only, never the security boundary. */
  const can = useCallback(
    (cap) => Boolean(user?.capabilities?.includes(cap)),
    [user],
  );

  const value = { user, loading, establishSession, logout, can };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

/** Capability constants — keep in sync with backend constants/roles.js. */
export const CAP = Object.freeze({
  VIEW: 'view',
  MANAGE_TICKETS: 'manage_tickets',
  EDIT_REVIEW: 'edit_review',
  DECIDE: 'decide',
  PUSH_INTEGRATION: 'push_integration',
  MANAGE_USERS: 'manage_users',
});
