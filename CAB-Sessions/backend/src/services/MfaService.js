/**
 * TOTP multi-factor authentication (compatible with Google Authenticator).
 * Encapsulates the speakeasy + qrcode details so controllers stay thin.
 */
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { config } from '../config/index.js';

export class MfaService {
  /**
   * Generate a fresh TOTP secret + a QR-code data URL the user scans once.
   * The base32 secret is persisted on the user; the otpauth URL is never stored.
   */
  async generateEnrollment(email) {
    const secret = speakeasy.generateSecret({
      name: `${config.mfa.issuer} (${email})`,
      issuer: config.mfa.issuer,
    });
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    return { base32: secret.base32, qrDataUrl };
  }

  /**
   * Verify a 6-digit token against the stored secret.
   * `window: 1` tolerates slight clock drift (±30s).
   */
  verifyToken(base32Secret, token) {
    if (!base32Secret || !token) return false;
    return speakeasy.totp.verify({
      secret: base32Secret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });
  }
}
