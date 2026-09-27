import { z } from 'zod';

/**
 * Validation schema for interview feedback submitted by interviewers.
 * Mirrors API validation rules for responsive client-side feedback.
 */

/**
 * Validates the rating score as an integer between 1 and 5.
 */
const rating = z
  .number({ error: 'Choose a rating from 1 to 5.' })
  .int('Choose a rating from 1 to 5.')
  .min(1, 'Choose a rating from 1 to 5.')
  .max(5, 'Choose a rating from 1 to 5.');

/**
 * Validates feedback notes (required, non-empty, trimmed, up to 5000 characters).
 */
const notes = z
  .string()
  .trim()
  .min(1, 'Write a few notes about this interview.')
  .max(5000, 'Keep your notes under 5000 characters.');

/**
 * Feedback form schema containing rating and notes.
 */
export const feedbackSchema = z.object({
  rating,
  notes,
});

export type FeedbackValues = z.infer<typeof feedbackSchema>;
