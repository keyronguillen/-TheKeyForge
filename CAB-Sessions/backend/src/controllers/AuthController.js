/**
 * Auth HTTP controller. Thin layer: parse the (already-validated) request,
 * call AuthService, shape the response. No business logic here.
 */
import { AuthService } from '../services/AuthService.js';

const auth = new AuthService();

export class AuthController {
  static async register(req, res) {
    res.status(201).json(await auth.register(req.body));
  }

  static async login(req, res) {
    res.json(await auth.login(req.body));
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
