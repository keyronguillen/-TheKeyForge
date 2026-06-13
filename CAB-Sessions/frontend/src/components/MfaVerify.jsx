/** MFA verification step at login: enter the current 6-digit code. */
import { useState } from 'react';
import { api } from '../api/client.js';

export function MfaVerify({ challenge, onVerified }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const session = await api.post('/auth/mfa/verify', { challenge, token });
      onVerified(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>Enter your authentication code</h2>
      <small>Open Google Authenticator and enter the current 6-digit code.</small>
      <form onSubmit={submit}>
        <label htmlFor="mfaCode">Authentication code</label>
        <input
          id="mfaCode" inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} placeholder="123456" autoFocus
          value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={busy || token.length !== 6} style={{ marginTop: '1rem', width: '100%' }}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  );
}
