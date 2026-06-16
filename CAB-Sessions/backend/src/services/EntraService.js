/**
 * Microsoft Entra ID (Azure AD) token verification.
 *
 * Validates the ID token the SPA obtains via MSAL, against Entra's published
 * JWKS (signature), with strict issuer + audience checks. We never trust claims
 * without verifying the signature first. No client secret is required for an
 * SPA (PKCE public client).
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config, isEntraEnabled } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

let jwks = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${config.entra.tenantId}/discovery/v2.0/keys`),
    );
  }
  return jwks;
}

export class EntraService {
  get enabled() {
    return isEntraEnabled;
  }

  /**
   * Verify an Entra ID token and return the normalized identity.
   * @returns {Promise<{oid:string, email:string, name:string}>}
   */
  async verifyIdToken(idToken) {
    if (!isEntraEnabled) {
      throw new AppError(503, 'Microsoft sign-in is not configured on the server.');
    }
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, getJwks(), {
        issuer: `https://login.microsoftonline.com/${config.entra.tenantId}/v2.0`,
        audience: config.entra.clientId,
      }));
    } catch {
      throw AppError.unauthorized('Invalid or expired Microsoft token.');
    }
    const email = (payload.preferred_username || payload.email || '').toLowerCase();
    if (!email) throw AppError.unauthorized('Microsoft token has no email/username claim.');
    return {
      oid: payload.oid ?? payload.sub,
      email,
      name: payload.name ?? email,
    };
  }
}
