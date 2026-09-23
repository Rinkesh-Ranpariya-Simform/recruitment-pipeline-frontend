'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { INTERVIEWS_DETAIL_KEY } from '@/features/interviews/hooks/useInterviewsQuery';
import { submitFeedback, updateFeedback } from '../api/feedback.api';
import type { FeedbackValues } from '@/lib/schemas/feedback';
import type { FeedbackPatch } from '../types';
import { feedbackKey } from './useFeedbackQuery';

/**
 * The two feedback mutations, sharing one cache policy.
 *
 * **No optimistic updates** (FE-4), matching every shipped mutation in this app
 * — and here there is a second reason beyond consistency: a submission can
 * `409` into an edit, so an optimistically appended card would then have to be
 * reconciled with a *different* row that already existed. The list a panellist
 * sees after submitting is the server's.
 *
 * **Invalidation is `onSettled`, not `onSuccess`, and that is the whole point of
 * this file** (FE-2). A `409 FEEDBACK_ALREADY_SUBMITTED` means this tab's view
 * was stale — the same person submitted from somewhere else — so the failure is
 * precisely the case where a refetch is most needed. It is also what makes the
 * form's prefill-and-switch-to-edit possible without an extra call (FR-4.2,
 * PERF-3).
 *
 * Toasts are raised by the caller rather than here: the `409` needs an
 * *informational* toast and a state change rather than an error, and only the
 * form knows which of the two verbs it fired.
 */

/**
 * What both writes invalidate.
 *
 * The round's feedback, obviously — and the interview detail too (FE-3), since
 * the round's own view is what mounts this feature and a submission changes what
 * it shows.
 *
 * Not `queryClient.clear()` — that would drop the identity cache and cost a
 * `GET /api/auth/me` on every write.
 */
const useInvalidateFeedback = (interviewId: number) => {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: feedbackKey(interviewId) });
    void queryClient.invalidateQueries({ queryKey: INTERVIEWS_DETAIL_KEY });
  };
};

/**
 * Files an assessment.
 *
 * Two panellists firing at the same instant both succeed — their rows do not
 * contend. The same panellist twice is one `201` and one `409`, which the caller
 * turns into an edit rather than an error (FR-4).
 */
export const useSubmitFeedback = (interviewId: number) => {
  const invalidate = useInvalidateFeedback(interviewId);

  return useMutation({
    mutationFn: (values: FeedbackValues) => submitFeedback(interviewId, values),
    onSettled: invalidate,
  });
};

/**
 * Corrects one.
 *
 * The patch carries **only what changed** (API-3) — the caller diffs against the
 * entry it prefilled from, so the audit trail records a rating that actually
 * moved rather than a wholesale rewrite.
 */
export const useUpdateFeedback = (interviewId: number) => {
  const invalidate = useInvalidateFeedback(interviewId);

  return useMutation({
    mutationFn: (patch: FeedbackPatch) => updateFeedback(interviewId, patch),
    onSettled: invalidate,
  });
};
