/**
 * Auth HTTP controller. Thin layer: parse the (already-validated) request,
 * call AuthService, shape the response. No business logic lives here.
 */
import { AuthService } from '../services/AuthService.js';

const auth = new AuthService();

export class AuthController {
  static async register(req, res) {
    const result = await auth.register(req.body);
    res.status(201).json(result);
  }

  static async login(req, res) {
    const result = await auth.login(req.body);
    res.json(result);
  }

  static async verifyMfa(req, res) {
    const result = await auth.verifyMfa(req.body);
    res.json(result);
  }

  static async confirmEnrollment(req, res) {
    const result = await auth.confirmMfaEnrollment(req.body);
    res.json(result);
  }

  /** Return the current session's profile (used by the SPA on load). */
  static async me(req, res) {
    res.json({ user: req.user });
  }
}
