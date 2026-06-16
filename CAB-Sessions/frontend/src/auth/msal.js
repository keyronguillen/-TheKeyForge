/**
 * Microsoft Entra ID sign-in via MSAL (popup flow, PKCE — no secret).
 * Config (tenantId/clientId) comes from the backend /auth/config so nothing
 * sensitive is hardcoded. Returns the ID token for the backend to verify.
 */
import { PublicClientApplication } from '@azure/msal-browser';

let pca = null;

async function getMsal({ clientId, tenantId }) {
  if (!pca) {
    pca = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin, // must be a registered SPA redirect URI
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    await pca.initialize();
  }
  return pca;
}

/** Open the Microsoft sign-in popup and return the ID token. */
export async function signInWithMicrosoft(cfg) {
  const msal = await getMsal(cfg);
  const result = await msal.loginPopup({
    scopes: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });
  return result.idToken;
}
