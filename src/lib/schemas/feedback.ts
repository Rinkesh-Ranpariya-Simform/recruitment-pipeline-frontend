import { z } from 'zod';

/**
 * Client-side feedback validation, **for the interviewer's benefit only**
 * (VAL-4).
 *
 * It mirrors the API's rules so the form can respond without a round trip.
 * **The API is what enforces them**: the disabled Submit button is an
 * affordance, the `400` is the control (AZ-4, XBE-3, XBE-4). If the two ever
 * disagree, this file is the one that is wrong.
 *
 * There is no `interviewId` here: the round being assessed comes from the
 * component's props, never from a form field. There is no `interviewerId`
 * either — the author is the token's subject, and the API has no field that
 * could carry one.
 */

/**
 * An integer 1–5, **not `z.coerce.number()`** (VAL-1).
 *
 * The API deliberately does not coerce a JSON body, so a string rating is a
 * `400` there; coercing here would only mask a bug in the control feeding this
 * schema. `<StarRating>` emits a `number` by its own type, so there is nothing
 * to coerce in the first place.
 *
 * One message for every failure mode — unselected, `0`, `6`, `4.5` — because
 * they all mean the same thing to the person reading it.
 */
const rating = z
  .number({ error: 'Choose a rating from 1 to 5.' })
  .int('Choose a rating from 1 to 5.')
  .min(1, 'Choose a rating from 1 to 5.')
  .max(5, 'Choose a rating from 1 to 5.');

/**
 * The assessment itself, required.
 *
 * `.trim()` runs before `.min(1)`, so whitespace alone fails here rather than
 * being sent and rejected — the same rule the API applies to the same field
 * (VAL-2). A rating with no words is a number, and a hiring manager cannot act
 * on a number.
 */
const notes = z
  .string()
  .trim()
  .min(1, 'Write a few notes about this interview.')
  .max(5000, 'Keep your notes under 5000 characters.');

/**
 * One schema for **both** verbs (VAL-3).
 *
 * The edit form reuses it rather than making both fields optional: partiality
 * belongs on the wire, where the client sends only what changed, not in what a
 * person is allowed to leave blank. An edit that clears the notes is an empty
 * assessment, and the API would reject it too.
 */
export const feedbackSchema = z.object({
  rating,
  notes,
});

export type FeedbackValues = z.infer<typeof feedbackSchema>;
