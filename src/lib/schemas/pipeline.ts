import { z } from 'zod';

/** Client-side validation schemas for pipeline actions (stage override and terminal outcomes). */

/** Validation schema for the stage override reason (minimum 10 characters required). */
const overrideReason = z
  .string()
  .trim()
  .min(10, 'Give a reason of at least 10 characters.')
  .max(1000, 'Keep the reason under 1000 characters.');

/** Validation schema for the target stage of an override. */
export const overrideSchema = z.object({
  toStage: z.enum(['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER'], {
    error: 'Choose a target stage.',
  }),
  reason: overrideReason,
});

/** Form schema for closing an application (HIRED / REJECTED) with an optional note. */
export const outcomeSchema = z.object({
  status: z.enum(['HIRED', 'REJECTED']),
  reason: z.string().trim().max(1000, 'Keep the reason under 1000 characters.').optional(),
});

export type OverrideValues = z.infer<typeof overrideSchema>;
export type OutcomeValues = z.infer<typeof outcomeSchema>;
