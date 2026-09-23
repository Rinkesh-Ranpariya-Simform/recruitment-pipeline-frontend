import { apiFetch } from '@/lib/api';
import type { FeedbackValues } from '@/lib/schemas/feedback';
import type { FeedbackListResponse, FeedbackPatch, FeedbackResponse } from '../types';

/**
 * Every feedback request the client makes — **three functions, and there will
 * not be a fourth** (FE-1).
 *
 * Components never assemble a path. Every path here nests under its round,
 * because that is how the API is shaped and the shape is the authorization model
 * made visible: there is no way to name an assessment without naming the round
 * it belongs to, so the question the API asks is always the same question.
 *
 * **There is no `deleteFeedback`**, because there is no such endpoint — a
 * `DELETE` answers `404` (XBE-9, FR-5.3). An exported wrapper for a missing
 * endpoint is how a deliberately-absent feature comes back by accident, the same
 * rule that keeps `deleteRole`… out of `roles.api.ts` and a `PATCH` out of
 * `audit.api.ts`.
 *
 * **None of these calls carries an interviewer id.** The API reads the author
 * from the verified token on the write, and resolves the assignment predicate
 * from it on the read.
 */

/**
 * Every assessment on one round, newest first.
 *
 * Both roles call this, and **both get the same shape** — neither may see more
 * than the other on this resource. Unpaginated: `{ feedback: [...] }` with no
 * envelope (XBE-10).
 *
 * A `404` means the round is gone **or** the caller is not assigned to it, and
 * the client cannot tell which — the API answers both byte-identically on
 * purpose. Render one not-found state and say nothing more.
 */
export const listFeedback = (interviewId: number): Promise<FeedbackListResponse> => {
  return apiFetch<FeedbackListResponse>(`/api/interviews/${interviewId}/feedback`);
};

/**
 * Files this interviewer's assessment of this round.
 *
 * `409 FEEDBACK_ALREADY_SUBMITTED` when they already have one — raised by a
 * unique index in the database, so it holds even for two submissions that
 * genuinely overlap. **It is not a dead end**: its remedy is the `PATCH` below,
 * and the form treats it as a route into editing (FR-4).
 *
 * `409 INTERVIEW_CANCELLED` when the round was cancelled. Hiding the form once
 * the round is cancelled is a convenience; **that `409` is the check.**
 *
 * `400` with `details.rating` / `details.notes` when the bounds are missed.
 * Disabling Submit is a convenience; **the `400` is the check.**
 */
export const submitFeedback = (
  interviewId: number,
  values: FeedbackValues,
): Promise<FeedbackResponse> => {
  return apiFetch<FeedbackResponse>(`/api/interviews/${interviewId}/feedback`, {
    method: 'POST',
    body: values,
  });
};

/**
 * Corrects the caller's own assessment of this round.
 *
 * **Only the changed fields are sent** (API-3), which is what keeps the audit
 * entry's `fromRating`/`toRating` pair meaningful rather than recording a
 * rewrite of everything.
 *
 * There is no feedback id in the path: the API resolves the row from the round
 * plus the token's subject, **in its `where`**. So a `404` here means either
 * "you have written nothing on this round" or "you are no longer on it", and
 * the two are deliberately indistinguishable. The client's "Your feedback"
 * marker is a display decision and authorizes nothing (XBE-6).
 */
export const updateFeedback = (
  interviewId: number,
  patch: FeedbackPatch,
): Promise<FeedbackResponse> => {
  return apiFetch<FeedbackResponse>(`/api/interviews/${interviewId}/feedback`, {
    method: 'PATCH',
    body: patch,
  });
};
