'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import { listFeedback } from '../api/feedback.api';

/** Query key factory for feedback on an interview round. */
export const feedbackKey = (interviewId: number) => {
  return ['feedback', 'interview', interviewId] as const;
};

/** Retry helper that prevents retrying on 404 responses. */
const retryExceptNotFound = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
};

/** Fetches all feedback assessments for a given interview round. */
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
