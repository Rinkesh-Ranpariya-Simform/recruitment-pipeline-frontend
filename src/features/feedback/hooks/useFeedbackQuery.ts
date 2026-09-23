'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import { listFeedback } from '../api/feedback.api';

/**
 * One key, one read (FE-2).
 *
 * Keyed by the round, because that is the only axis this resource has: there is
 * no filter, no page and no role dimension. **Not keyed by role** — one session
 * is one role, and both roles receive the identical shape from this endpoint
 * anyway.
 */
export const feedbackKey = (interviewId: number) => {
  return ['feedback', 'interview', interviewId] as const;
};

/**
 * A `404` is the API's final answer on a round, so retrying one is pure delay.
 *
 * It matters here for the same reason it matters on the round itself: for an
 * interviewer a `404` is also how the API says "outside your scope", and it will
 * keep saying it. Mirrors `useInterviewsQuery`'s policy rather than inventing a
 * second one.
 */
const retryExceptNotFound = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
};

/**
 * A round's whole panel of assessments — **one request for the panel, never one
 * per entry** (PERF-1).
 *
 * The interviewer's scoping is the API's, not this call's: the assignment
 * predicate is in the server's own `where`, resolved from the verified token.
 * An entry from a round this caller is not on is never in the response, so
 * **nothing here filters and nothing here must start** — the same rule the
 * interviews list follows.
 *
 * This hook is **not** called on the recruiter's candidate detail (API-6): the
 * candidate payload carries each round's feedback inline, so a candidate with
 * five rounds costs one request rather than six.
 */
export const useFeedbackQuery = (interviewId: number | null) => {
  return useQuery({
    // Non-null inside the query function: `enabled` keeps it from running
    // otherwise, matching the shipped detail queries.
    queryKey: feedbackKey(interviewId ?? 0),
    queryFn: () => listFeedback(interviewId as number),
    enabled: interviewId !== null,
    retry: retryExceptNotFound,
  });
};
