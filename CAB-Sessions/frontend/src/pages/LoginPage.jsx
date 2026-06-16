/**
 * Login page — drives the multi-stage auth flow:
 *   credentials → (MFA verify | MFA enrollment) → session established.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { MfaVerify } from '../components/MfaVerify.jsx';
import { MfaEnroll } from '../components/MfaEnroll.jsx';
import { signInWithMicrosoft } from '../auth/msal.js';

const STAGE = { CREDENTIALS: 'credentials', VERIFY: 'verify', ENROLL: 'enroll' };

export default function LoginPage() {
  const { establishSession } = useAuth();
  const [stage, setStage] = useState(STAGE.CREDENTIALS);
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfa, setMfa] = useState({ challenge: null, qrDataUrl: null, enrollmentToken: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [entra, setEntra] = useState(null);   // { enabled, tenantId, clientId }

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Discover whether Microsoft sign-in is configured on the backend.
  useEffect(() => {
    api.get('/auth/config').then((c) => setEntra(c.entra)).catch(() => setEntra({ enabled: false }));
  }, []);

  const signInMicrosoft = async () => {
    setError(''); setBusy(true);
    try {
      const idToken = await signInWithMicrosoft({ tenantId: entra.tenantId, clientId: entra.clientId });
      const session = await api.post('/auth/entra', { idToken });
      establishSession(session);
    } catch (err) {
      // Ignore the user simply closing the popup.
      if (err?.errorCode !== 'user_cancelled') setError(err.message || 'Microsoft sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitCredentials = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await api.post('/auth/login', form);
      if (res.mfaRequired) {
        setMfa({ challenge: res.challenge });
        setStage(STAGE.VERIFY);
      } else if (res.mfaEnrollmentRequired) {
        setMfa({ qrDataUrl: res.qrDataUrl, enrollmentToken: res.enrollmentToken });
        setStage(STAGE.ENROLL);
      } else if (res.token) {
        establishSession(res); // no-MFA fallback
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand"><div className="logo" /><strong>CAB-Sessions</strong></div>

        {stage === STAGE.CREDENTIALS && (
          <>
            <h2>Sign in</h2>
            <small>Control & ownership of your CAB sessions.</small>
            <form onSubmit={submitCredentials}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={form.password} onChange={update('password')} required />
              {error && <div className="error">{error}</div>}
              <button type="submit" disabled={busy} style={{ marginTop: '1rem', width: '100%' }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {entra?.enabled && (
              <>
                <div className="divider"><span>or</span></div>
                <button className="ms-btn" disabled={busy} onClick={signInMicrosoft}>
                  <span className="ms-logo" aria-hidden="true" />
                  Sign in with Microsoft
                </button>
                <small style={{ display: 'block', marginTop: '.4rem', textAlign: 'center' }}>
                  Uses your organization account + Microsoft MFA.
                </small>
              </>
            )}

            <p className="center" style={{ marginTop: '1rem' }}>
              <small>No account? </small>
              <Link to="/register" className="muted-link">Create one</Link>
            </p>
          </>
        )}

        {stage === STAGE.VERIFY && (
          <MfaVerify challenge={mfa.challenge} onVerified={establishSession} />
        )}

        {stage === STAGE.ENROLL && (
          <MfaEnroll qrDataUrl={mfa.qrDataUrl} enrollmentToken={mfa.enrollmentToken} onEnrolled={establishSession} />
        )}
      </div>
    </div>
  );
}
