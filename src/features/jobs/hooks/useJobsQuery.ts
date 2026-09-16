'use client';

import { useQuery } from '@tanstack/react-query';

import { listJobs } from '../api/jobs.api';
import type { JobsSearchParams } from '../search-params';

/**
 * The list query key, scoped by search term and page. Both come from the URL, so
 * changing either is an ordinary key change and Back works with no extra cache
 * handling.
 */
export function jobsListKey({ q, page }: JobsSearchParams) {
  return ['jobs', 'list', { q, page }] as const;
}

/**
 * Reads a page of open positions, using the provider's default `staleTime` of
 * 30s.
 *
 * `placeholderData` keeps the previous page on screen while the next one loads,
 * so changing the search term or the page dims the list rather than blanking it.
 * An empty flash between pages reads as "no results", which is the one thing
 * this view must not say by accident.
 */
export function useJobsQuery(params: JobsSearchParams) {
  return useQuery({
    queryKey: jobsListKey(params),
    queryFn: () => listJobs(params),
    placeholderData: (previous) => previous,
  });
}
