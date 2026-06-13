/** Zod validation schemas for all write endpoints. */
import { z } from 'zod';
import { DECISION_VALUES } from '../constants/enums.js';

const email = z.string().trim().toLowerCase().email().max(254);
// Strong-ish password policy for the POC: 8+ chars, upper, lower, digit.
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/[a-z]/, 'Needs a lowercase letter')
  .regex(/[0-9]/, 'Needs a digit');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const mfaVerifySchema = z.object({
  challenge: z.string().min(10),
  token: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const mfaConfirmSchema = z.object({
  enrollmentToken: z.string().min(10),
  token: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

const isoDate = z.string().min(4).max(40); // accept ISO date or datetime strings

export const ticketCreateSchema = z.object({
  requestor: z.string().trim().min(1).max(160),
  requestedDate: isoDate,
  uatProposedDate: isoDate.optional().nullable(),
  prodProposedDate: isoDate.optional().nullable(),
  assignee: z.string().trim().max(160).optional().nullable(),
  snowTicketNumber: z.string().trim().max(60).optional().nullable(),
  adoTicketNumber: z.string().trim().max(60).optional().nullable(),
  snowDescription: z.string().trim().max(4000).optional().nullable(),
  adoDescription: z.string().trim().max(4000).optional().nullable(),
});

// All fields optional for partial updates.
export const ticketUpdateSchema = ticketCreateSchema.partial();

export const reviewSchema = z.object({
  tools_touched: z.string().max(4000).optional().nullable(),
  compliance_process: z.string().max(4000).optional().nullable(),
  what_it_fixes: z.string().max(4000).optional().nullable(),
  what_deprecated: z.string().max(4000).optional().nullable(),
});

export const decisionSchema = z.object({
  decision: z.enum(DECISION_VALUES),
  comment: z.string().max(2000).optional().nullable(),
  notify: z.boolean().optional(),
  pushIntegration: z.boolean().optional(),
});
