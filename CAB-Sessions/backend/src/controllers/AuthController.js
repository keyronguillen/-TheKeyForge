/**
 * Auth HTTP controller. Thin layer: parse the (already-validated) request,
 * call AuthService, shape the response. No business logic here.
 */
import { AuthService } from '../services/AuthService.js';
import { isEntraEnabled, config } from '../config/index.js';

const auth = new AuthService();

export class AuthController {
  static async register(req, res) {
    res.status(201).json(await auth.register(req.body));
  }

  static async login(req, res) {
    res.json(await auth.login(req.body));
  }

  /** Public config the SPA needs to show/configure the Microsoft sign-in button. */
  static async authConfig(_req, res) {
    res.json({
      entra: isEntraEnabled
        ? { enabled: true, tenantId: config.entra.tenantId, clientId: config.entra.clientId }
        : { enabled: false },
    });
  }

  /** Microsoft SSO: exchange a verified Entra ID token for our session. */
  static async entraLogin(req, res) {
    res.json(await auth.loginWithEntra(req.body));
  }

  static async verifyMfa(req, res) {
    res.json(await auth.verifyMfa(req.body));
  }

  static async confirmEnrollment(req, res) {
    res.json(await auth.confirmMfaEnrollment(req.body));
  }

  /** Current session profile (used by the SPA on load). */
  static async me(req, res) {
    res.json({ user: req.user });
  }
}
