/**
 * Authentication & account lifecycle (async / PostgreSQL).
 *
 * Login is a two-step flow when MFA is enabled:
 *   1. POST /auth/login   (email + password)  -> { mfaRequired: true, challenge }
 *   2. POST /auth/mfa/verify (challenge + token) -> { token: <JWT> }
 *
 * Security choices:
 *   - bcrypt password hashing (cost 12)
 *   - generic error messages (no user-enumeration)
 *   - short-lived JWTs signed with a server secret
 *   - a short-lived "challenge" token gates the MFA step so a valid password
 *     alone never yields a session.
 *
 * Note: with durable Postgres the mfa_enabled flag persists across logins, so a
 * returning user goes straight to the verify step (no re-enrollment).
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { MfaService } from './MfaService.js';
import { EntraService } from './EntraService.js';
import { ROLES, capabilitiesForRole } from '../constants/roles.js';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor() {
    this.users = new UserRepository();
    this.audit = new AuditRepository();
    this.mfa = new MfaService();
    this.entra = new EntraService();
  }

  /**
   * Microsoft Entra SSO. Verifies the ID token, then finds or JIT-creates the
   * local user (matched by email) and issues our normal session. MFA was already
   * enforced by Microsoft during sign-in, so no local TOTP step is needed.
   * Emails listed in ENTRA_ADMIN_EMAILS are provisioned as Admin.
   */
  async loginWithEntra({ idToken }) {
    const identity = await this.entra.verifyIdToken(idToken);

    let user = await this.users.findByEmail(identity.email);
    if (!user) {
      const isAdmin = config.entra.adminEmails.includes(identity.email);
      const roleId = await this.users.roleIdByName(isAdmin ? ROLES.ADMIN : ROLES.READER);
      const created = await this.users.insert({
        full_name: identity.name,
        email: identity.email,
        password_hash: 'entra-sso', // unusable for local login (bcrypt never matches)
        role_id: roleId,
        mfa_enabled: true,          // MFA handled by Microsoft
      });
      user = await this.users.findByIdWithRole(created.id);
    }

    await this.audit.record({ actorId: user.id, action: 'auth.login_entra', entity: 'user', entityId: user.id });
    return this.#issueSession(user);
  }

  /** Register a new account. New self-registrations default to the Reader role. */
  async register({ fullName, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.users.findByEmail(normalizedEmail)) {
      throw AppError.conflict('An account with that email already exists.');
    }
    const roleId = await this.users.roleIdByName(ROLES.READER);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await this.users.insert({
      full_name: fullName.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role_id: roleId,
    });
    await this.audit.record({ actorId: user.id, action: 'auth.register', entity: 'user', entityId: user.id });

    return this.startMfaEnrollment(user.id);
  }

  /** Step 1 of login. Returns either a JWT (no MFA yet) or an MFA challenge. */
  async login({ email, password }) {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) throw AppError.unauthorized('Invalid email or password.');

    if (!user.mfa_enabled) {
      const enrollment = await this.startMfaEnrollment(user.id);
      return { mfaEnrollmentRequired: true, ...enrollment };
    }

    const challenge = jwt.sign({ sub: user.id, stage: 'mfa' }, config.jwt.secret, { expiresIn: '5m' });
    return { mfaRequired: true, challenge };
  }

  /** Step 2 of login: verify the TOTP token against the challenge. */
  async verifyMfa({ challenge, token }) {
    let payload;
    try {
      payload = jwt.verify(challenge, config.jwt.secret);
    } catch {
      throw AppError.unauthorized('MFA challenge expired. Please log in again.');
    }
    if (payload.stage !== 'mfa') throw AppError.unauthorized('Invalid MFA challenge.');

    const user = await this.users.findByIdWithRole(payload.sub);
    if (!user || !this.mfa.verifyToken(user.mfa_secret, token)) {
      throw AppError.unauthorized('Invalid MFA code.');
    }
    await this.audit.record({ actorId: user.id, action: 'auth.login', entity: 'user', entityId: user.id });
    return this.#issueSession(user);
  }

  /** Generate a new TOTP secret + QR for a user (enrollment / re-enrollment). */
  async startMfaEnrollment(userId) {
    const user = await this.users.findByIdWithRole(userId);
    if (!user) throw AppError.notFound('User not found.');
    const { base32, qrDataUrl } = await this.mfa.generateEnrollment(user.email);
    await this.users.update(userId, { mfa_secret: base32, mfa_enabled: false });
    const enrollmentToken = jwt.sign({ sub: userId, stage: 'enroll' }, config.jwt.secret, { expiresIn: '15m' });
    return { mfaEnrollmentRequired: true, qrDataUrl, enrollmentToken };
  }

  /** Confirm enrollment: user proves they scanned the QR by sending a valid code. */
  async confirmMfaEnrollment({ enrollmentToken, token }) {
    let payload;
    try {
      payload = jwt.verify(enrollmentToken, config.jwt.secret);
    } catch {
      throw AppError.unauthorized('Enrollment session expired. Please start again.');
    }
    if (payload.stage !== 'enroll') throw AppError.unauthorized('Invalid enrollment session.');

    const user = await this.users.findByIdWithRole(payload.sub);
    if (!user || !this.mfa.verifyToken(user.mfa_secret, token)) {
      throw AppError.unauthorized('Invalid MFA code.');
    }
    await this.users.update(user.id, { mfa_enabled: true });
    await this.audit.record({ actorId: user.id, action: 'auth.mfa_enrolled', entity: 'user', entityId: user.id });
    return this.#issueSession({ ...user, mfa_enabled: true });
  }

  /** Build the signed session JWT + the safe user profile for the client. */
  #issueSession(user) {
    const profile = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      capabilities: capabilitiesForRole(user.role),
    };
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    return { token, user: profile };
  }
}
