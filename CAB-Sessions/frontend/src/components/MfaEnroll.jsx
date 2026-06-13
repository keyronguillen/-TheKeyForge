/**
 * MFA enrollment step: shows the QR code to scan with Google Authenticator,
 * then confirms by entering the first 6-digit code. On success we get a session.
 */
import { useState } from 'react';
import { api } from '../api/client.js';

export function MfaEnroll({ qrDataUrl, enrollmentToken, onEnrolled }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const session = await api.post('/auth/mfa/confirm', { enrollmentToken, token });
      onEnrolled(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Set up two-factor authentication</h2>
      <small>Scan this QR code with Google Authenticator (or any TOTP app), then enter the 6-digit code to finish.</small>
      <img className="qr" src={qrDataUrl} alt="MFA QR code" />
      <form onSubmit={submit}>
        <label htmlFor="enrollCode">Authentication code</label>
        <input
          id="enrollCode" inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} placeholder="123456"
          value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy || token.length !== 6} style={{ marginTop: '1rem', width: '100%' }}>
          {busy ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
    </div>
  );
}
