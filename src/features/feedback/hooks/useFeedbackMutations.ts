'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { INTERVIEWS_DETAIL_KEY } from '@/features/interviews/hooks/useInterviewsQuery';
import { submitFeedback, updateFeedback } from '../api/feedback.api';
import type { FeedbackValues } from '@/lib/schemas/feedback';
import type { FeedbackPatch } from '../types';
import { feedbackKey } from './useFeedbackQuery';

/** Feedback mutations for submitting and updating interview assessments. */

/** Invalidates feedback list and interview detail queries on write. */
const useInvalidateFeedback = (interviewId: number) => {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: feedbackKey(interviewId) });
    void queryClient.invalidateQueries({ queryKey: INTERVIEWS_DETAIL_KEY });
  };
};

/** Submits a new interview feedback assessment. */
export const useSubmitFeedback = (interviewId: number) => {
  const invalidate = useInvalidateFeedback(interviewId);

  return useMutation({
    mutationFn: (values: FeedbackValues) => submitFeedback(interviewId, values),
    onSettled: invalidate,
  });
};

/** Updates an existing interview feedback assessment. */
export const useUpdateFeedback = (interviewId: number) => {
  const invalidate = useInvalidateFeedback(interviewId);

  return useMutation({
    mutationFn: (patch: FeedbackPatch) => updateFeedback(interviewId, patch),
    onSettled: invalidate,
  });
};
