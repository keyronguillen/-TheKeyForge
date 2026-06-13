/**
 * Role definitions and capability matrix (Section 3).
 *
 * Roles are intentionally defined ONCE here and consumed everywhere (RBAC
 * middleware, seed data, and exposed to the frontend) so the system has a
 * single source of truth — DRY and audit-friendly.
 */

export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  COMPLIANCE: 'Compliance',
  APPROVER: 'Approver',
  REVIEWER: 'Reviewer',
  ACTOR: 'Actor',
  BUSINESS: 'Business',
  READER: 'Reader',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/**
 * Capabilities are coarse-grained permissions. The RBAC middleware checks a
 * capability rather than a raw role, so we can re-shuffle which roles get what
 * without touching every route.
 */
export const CAP = Object.freeze({
  VIEW: 'view',                 // see the tool & tickets (everyone)
  MANAGE_TICKETS: 'manage_tickets', // create/edit CAB tickets
  EDIT_REVIEW: 'edit_review',   // edit Tab 2 (compliance / impact)
  DECIDE: 'decide',             // make an approval decision (Tab 3)
  PUSH_INTEGRATION: 'push_integration', // push decision to SNOW/ADO
  MANAGE_USERS: 'manage_users', // admin: users & roles
});

/**
 * Which roles hold which capability. Admin implicitly holds everything (handled
 * in the RBAC helper) so it is omitted from most lists for clarity.
 */
const MATRIX = {
  [CAP.VIEW]: ALL_ROLES,
  [CAP.MANAGE_TICKETS]: [ROLES.ADMIN, ROLES.REVIEWER, ROLES.BUSINESS],
  [CAP.EDIT_REVIEW]: [ROLES.ADMIN, ROLES.COMPLIANCE, ROLES.REVIEWER],
  [CAP.DECIDE]: [ROLES.ADMIN, ROLES.APPROVER, ROLES.COMPLIANCE],
  [CAP.PUSH_INTEGRATION]: [ROLES.ADMIN, ROLES.ACTOR, ROLES.APPROVER],
  [CAP.MANAGE_USERS]: [ROLES.ADMIN],
};

/** True if `role` is allowed to perform `capability`. Admin can do anything. */
export function roleHasCapability(role, capability) {
  if (role === ROLES.ADMIN) return true;
  return (MATRIX[capability] ?? []).includes(role);
}

/** All capabilities a role holds — handy for the frontend to hide/disable UI. */
export function capabilitiesForRole(role) {
  return Object.values(CAP).filter((cap) => roleHasCapability(role, cap));
}
