/**
 * Registration page. After creating the account the backend immediately returns
 * an MFA enrollment challenge, so we render the enrollment step inline.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { MfaEnroll } from '../components/MfaEnroll.jsx';

export default function RegisterPage() {
  const { establishSession } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [enroll, setEnroll] = useState(null); // { qrDataUrl, enrollmentToken }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await api.post('/auth/register', form);
      setEnroll({ qrDataUrl: res.qrDataUrl, enrollmentToken: res.enrollmentToken });
    } catch (err) {
      // Surface field-level validation messages if present.
      setError(err.details?.map((d) => d.message).join(' · ') || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand"><div className="logo" /><strong>CAB-Sessions</strong></div>

        {!enroll ? (
          <>
            <h2>Create your account</h2>
            <small>New accounts start with the Reader role; an Admin can elevate you.</small>
            <form onSubmit={submit}>
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" value={form.fullName} onChange={update('fullName')} required />
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={form.email} onChange={update('email')} required />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={form.password} onChange={update('password')} required />
              <small>Min 8 chars, with upper, lower &amp; a digit.</small>
              {error && <div className="error">{error}</div>}
              <button type="submit" disabled={busy} style={{ marginTop: '1rem', width: '100%' }}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
            </form>
            <p className="center" style={{ marginTop: '1rem' }}>
              <small>Already have an account? </small>
              <Link to="/login" className="muted-link">Sign in</Link>
            </p>
          </>
        ) : (
          <MfaEnroll qrDataUrl={enroll.qrDataUrl} enrollmentToken={enroll.enrollmentToken} onEnrolled={establishSession} />
        )}
      </div>
    </div>
  );
}
