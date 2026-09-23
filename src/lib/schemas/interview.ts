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
  /**
   * **OPTIONAL**, and an empty string is the normal way to leave it so.
   *
   * A round can now exist before a date does: the applications table starts a
   * phone screen with one click and nobody has agreed a time yet. Requiring a
   * date here would force a recruiter to invent one, which is worse than an
   * empty column because nothing downstream can tell an invented date from a
   * real one.
   *
   * A value that is present must still parse — `?` and `??` are not valid
   * datetimes and should say so before a round trip.
   */
  scheduledAt: z
    .string()
    .refine(
      (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
      'Enter a valid date and time, or leave it blank.',
    ),
});

/** The form's values — the local-time string, before conversion. */
export type ScheduleInterviewFormValues = z.infer<typeof scheduleInterviewSchema>;

/**
 * Just the date, for the "Edit date" dialog on a round's page.
 *
 * Blank is meaningful and is not the same as not submitting: it clears the date
 * back to undated, which is what a recruiter whose slot fell through actually
 * wants.
 */
export const editInterviewDateSchema = z.object({
  scheduledAt: z
    .string()
    .refine(
      (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
      'Enter a valid date and time, or leave it blank to clear it.',
    ),
});

export type EditInterviewDateFormValues = z.infer<typeof editInterviewDateSchema>;

/**
 * What the API is actually sent: the same two enums, and a UTC instant **or
 * `null`**.
 *
 * `null`, not an omitted key: the backend accepts both and treats them
 * identically, and sending the null makes "no date" an explicit decision in the
 * payload rather than something a reader has to infer from an absence.
 */
export interface ScheduleInterviewValues {
  type: ScheduleInterviewFormValues['type'];
  stage: ScheduleInterviewFormValues['stage'];
  scheduledAt: string | null;
}

/**
 * The local-time string a `datetime-local` input produces, as the UTC instant
 * the API takes — or `null` when it is blank.
 *
 * `new Date(...)` reads the value in the browser's zone and `toISOString()`
 * renders that instant in UTC, so 9:30 typed in IST is sent as `04:00Z`, not
 * `09:30Z`. Sending the raw value would schedule every round in a non-UTC
 * browser at the wrong time — which is why this conversion is here, once,
 * rather than in each dialog.
 */
export const toScheduledAtInstant = (localValue: string): string | null => {
  return localValue === '' ? null : new Date(localValue).toISOString();
};

/**
 * The reverse, for seeding the edit dialog: a UTC instant as the
 * `datetime-local` string for the viewer's own clock.
 *
 * `toISOString().slice(0, 16)` is the obvious version and it is wrong — it
 * renders UTC into an input the browser reads as local time, so a recruiter in
 * IST opening a 09:30 round sees 04:00. Subtracting the offset first is what
 * makes the round trip lossless.
 */
export const toLocalDateTimeValue = (iso: string | null): string => {
  if (iso === null) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** Choosing somebody for a panel. */
export const assignInterviewerSchema = z.object({
  interviewerId: z.coerce
    .number('Choose an interviewer.')
    .int('Choose an interviewer.')
    .positive('Choose an interviewer.'),
});

export type AssignInterviewerValues = z.infer<typeof assignInterviewerSchema>;
