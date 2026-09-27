'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import {
  getInterviewerCandidate,
  getRecruiterCandidate,
  listInterviewerCandidates,
  listRecruiterCandidates,
} from '../api/candidates.api';
import type { CandidatesSearchParams, RecruiterCandidatesSearchParams } from '../search-params';

/**
 * React Query hooks and query key factories for candidates data fetching.
 */

/**
 * Generates query key for candidate list queries based on search parameters and pagination.
 */
export const candidatesListKey = (params: Partial<RecruiterCandidatesSearchParams>) => {
  return [
    'candidates',
    'list',
    {
      q: params.q,
      roleId: params.roleId,
      stage: params.stage,
      status: params.status,
      page: params.page,
    },
  ] as const;
};

/** Shared root key prefix for candidate list queries, used for cache invalidation. */
export const CANDIDATES_LIST_KEY = ['candidates', 'list'] as const;

/** Generates query key for candidate detail queries. */
export const candidateDetailKey = (candidateId: number) => {
  return ['candidates', 'detail', candidateId] as const;
};

/**
 * Validates and converts a candidate ID string segment into a positive integer,
 * returning null if invalid.
 */
export const parseCandidateId = (candidateId: string): number | null => {
  return /^\d+$/.test(candidateId) && Number(candidateId) > 0 ? Number(candidateId) : null;
};

/**
 * React Query retry policy that skips retries on 404 Not Found errors.
 */
const retryExceptNotFound = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
};

/**
 * Fetches a paginated candidate list for recruiters, with previous-data preservation.
 */
export const useRecruiterCandidatesQuery = (
  params: Partial<RecruiterCandidatesSearchParams>,
  options: { enabled?: boolean } = {},
) => {
  return useQuery({
    queryKey: candidatesListKey(params),
    queryFn: () => listRecruiterCandidates(params),
    placeholderData: (previous) => previous,
    enabled: options.enabled ?? true,
  });
};

/**
 * Fetches assigned candidates for the current interviewer.
 */
export const useInterviewerCandidatesQuery = (params: CandidatesSearchParams) => {
  return useQuery({
    queryKey: candidatesListKey(params),
    queryFn: () => listInterviewerCandidates(params),
    placeholderData: (previous) => previous,
  });
};

/**
 * Fetches comprehensive candidate details for recruiters by ID.
 */
export const useRecruiterCandidateQuery = (candidateId: number | null) => {
  return useQuery({
    queryKey: candidateDetailKey(candidateId ?? 0),
    queryFn: () => getRecruiterCandidate(candidateId as number),
    enabled: candidateId !== null,
    retry: retryExceptNotFound,
  });
};

/**
 * Fetches candidate details and assigned rounds for interviewers by ID.
 */
export const useInterviewerCandidateQuery = (candidateId: number | null) => {
  return useQuery({
    queryKey: candidateDetailKey(candidateId ?? 0),
    queryFn: () => getInterviewerCandidate(candidateId as number),
    enabled: candidateId !== null,
    retry: retryExceptNotFound,
  });
};
