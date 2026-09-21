import { z } from 'zod';

/**
 * Client-side pipeline validation, **for the recruiter's benefit only** (VAL-1).
 *
 * It mirrors the API's rules so the override dialog can respond without a round
 * trip. **The API is what enforces them**: the disabled Submit button is an
 * affordance, the `400` is the control (AZ-5, SEC-5, XBE-5). If the two ever
 * disagree, this file is the one that is wrong.
 *
 * `.trim()` runs before `.min(10)`, so ten spaces fail here rather than being
 * sent and rejected — the same rule the API applies to the same field (VAL-2).
 *
 * Neither schema has an `applicationId`: the row being acted on comes from the
 * component's props, never from a form field.
 */

/**
 * The reason an override is recorded against.
 *
 * The 10-character minimum is deliberate rather than cosmetic: it makes "ok"
 * and "." fail, which is the difference between recording a reason and
 * recording a keystroke.
 */
const overrideReason = z
  .string()
  .trim()
  .min(10, 'Give a reason of at least 10 characters.')
  .max(1000, 'Keep the reason under 1000 characters.');

/**
 * The target stage of an override.
 *
 * Any of the four — the override is the escape hatch from the stage graph, and
 * the API accepts any stage other than the current one, forwards or backwards
 * (XBE-10). The dialog removes the current stage from the select (FR-6.2), so
 * the API's `toStage === currentStage` 400 is unreachable through the UI; this
 * schema does not restate that rule, because it does not know the current
 * stage and a second copy of it would be a second thing to keep in step.
 */
export const overrideSchema = z.object({
  toStage: z.enum(['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER'], {
    error: 'Choose a target stage.',
  }),
  reason: overrideReason,
});

/**
 * The outcome dialog.
 *
 * `reason` is **optional and has no minimum**, matching the API (VAL-5).
 * Rejecting at the defined end of a stage is not an exception to the process —
 * skipping one is, which is why only the override demands an explanation.
 *
 * `status` is set by the menu item that opened the dialog and is never typed,
 * so it carries no message.
 */
export const outcomeSchema = z.object({
  status: z.enum(['HIRED', 'REJECTED']),
  reason: z.string().trim().max(1000, 'Keep the reason under 1000 characters.').optional(),
});

export type OverrideValues = z.infer<typeof overrideSchema>;
export type OutcomeValues = z.infer<typeof outcomeSchema>;
