'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import { getJob } from '../api/jobs.api';

export function jobDetailKey(jobId: number) {
  return ['jobs', 'detail', jobId] as const;
}

/**
 * Reads one open position.
 *
 * `enabled` is false for a non-positive id so an invalid `[jobId]` segment
 * (`/jobs/abc`) never issues a request at all — the view renders its own
 * not-found panel, which is a better answer than a 400 the user can't act on.
 *
 * A 404 is **not** retried. It is the answer, not a failure: the position is
 * closed or was never there, and retrying it three times just delays the panel.
 */
export function useJobQuery(jobId: number) {
  return useQuery({
    queryKey: jobDetailKey(jobId),
    queryFn: () => getJob(jobId),
    enabled: Number.isInteger(jobId) && jobId > 0,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
}
