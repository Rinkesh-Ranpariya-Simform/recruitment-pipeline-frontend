import { apiFetch } from '@/lib/api';
import type { FeedbackValues } from '@/lib/schemas/feedback';
import type { FeedbackListResponse, FeedbackPatch, FeedbackResponse } from '../types';

/** Feedback API client functions for listing, submitting, and updating interview assessments. */

/** Fetches all assessments for a specified interview round. */
export const listFeedback = (interviewId: number): Promise<FeedbackListResponse> => {
  return apiFetch<FeedbackListResponse>(`/api/interviews/${interviewId}/feedback`);
};

/** Submits new feedback for an interview round. */
export const submitFeedback = (
  interviewId: number,
  values: FeedbackValues,
): Promise<FeedbackResponse> => {
  return apiFetch<FeedbackResponse>(`/api/interviews/${interviewId}/feedback`, {
    method: 'POST',
    body: values,
  });
};

/** Updates the author's own feedback for an interview round. */
export const updateFeedback = (
  interviewId: number,
  patch: FeedbackPatch,
): Promise<FeedbackResponse> => {
  return apiFetch<FeedbackResponse>(`/api/interviews/${interviewId}/feedback`, {
    method: 'PATCH',
    body: patch,
  });
};
