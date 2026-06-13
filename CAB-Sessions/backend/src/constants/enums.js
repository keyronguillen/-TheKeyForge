/** Shared enumerations for CAB tickets and approval decisions. */

/** Approval decision states (Section 2, Tab 3 dropdown). */
export const DECISION = Object.freeze({
  APPROVED: 'approved',
  REJECTED: 'rejected',
  TO_BE_REVIEWED: 'to_be_reviewed',
  PENDING: 'pending',
});

export const DECISION_VALUES = Object.freeze(Object.values(DECISION));

/** Where a CAB ticket sits in the lifecycle (drives the table status chip). */
export const TICKET_STATUS = Object.freeze({
  NEW: 'new',
  IN_REVIEW: 'in_review',
  DECIDED: 'decided',
});
