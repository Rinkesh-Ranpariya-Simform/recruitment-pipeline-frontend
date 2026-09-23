import { z } from 'zod';

/**
 * Client-side interview validation, for UX only. It mirrors the backend's rules
 * so the dialogs can respond without a round trip; the API is what actually
 * enforces them. If the two disagree, this file is the one that is wrong.
 */

/** The five round types, matching the backend enum exactly. */
export const INTERVIEW_TYPE_VALUES = [
  'PHONE_SCREEN',
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'CULTURE_FIT',
  'HIRING_MANAGER',
] as const;

/** The four live stages. A round's stage says what it is FOR. */
export const PIPELINE_STAGE_VALUES = ['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER'] as const;

/**
 * A new round.
 *
 * **`scheduledAt` carries no minimum, deliberately.** Backfilling a round that
 * already happened is a normal thing to do, the API has no `.min(now)` either,
 * and a client-side floor the server does not share would block a legitimate
 * action with no way for the recruiter to see why.
 *
 * The value here is the raw `datetime-local` string — local time, no zone. The
 * dialog converts it to an ISO UTC instant before sending, so 9:30 typed in IST
 * does not arrive as `09:30Z`.
 */
export const scheduleInterviewSchema = z.object({
  type: z.enum(INTERVIEW_TYPE_VALUES, 'Choose an interview type.'),
  stage: z.enum(PIPELINE_STAGE_VALUES, 'Choose the stage this round is for.'),
  scheduledAt: z
    .string('Choose a date and time.')
    .min(1, 'Choose a date and time.')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Choose a date and time.'),
});

/** The form's values — the local-time string, before conversion. */
export type ScheduleInterviewFormValues = z.infer<typeof scheduleInterviewSchema>;

/** What the API is actually sent: the same two enums, and a UTC instant. */
export interface ScheduleInterviewValues {
  type: ScheduleInterviewFormValues['type'];
  stage: ScheduleInterviewFormValues['stage'];
  scheduledAt: string;
}

/** Choosing somebody for a panel. */
export const assignInterviewerSchema = z.object({
  interviewerId: z.coerce
    .number('Choose an interviewer.')
    .int('Choose an interviewer.')
    .positive('Choose an interviewer.'),
});

export type AssignInterviewerValues = z.infer<typeof assignInterviewerSchema>;
