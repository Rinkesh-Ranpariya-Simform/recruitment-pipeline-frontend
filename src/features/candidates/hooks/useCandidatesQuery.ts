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
 * The candidate queries and their key factories (FE-5).
 *
 * **Not keyed by role.** One session is one role, so the two projections can
 * never collide in a single cache — and keying by role would suggest a user can
 * switch, which this app has no mechanism for. The same decision
 * `useInterviewsQuery` already records.
 */

/**
 * The list key, scoped by every filter and the page. All of them come from the
 * URL, so changing any is an ordinary key change and Back works with no extra
 * cache handling.
 *
 * `q` is `undefined` in an interviewer's params, which is not a special case
 * here — their params type simply has no such field.
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

/** The prefix every list page shares — what a write invalidates (FE-5, FE-11). */
export const CANDIDATES_LIST_KEY = ['candidates', 'list'] as const;

/** The key for one candidate. */
export const candidateDetailKey = (candidateId: number) => {
  return ['candidates', 'detail', candidateId] as const;
};

/**
 * Turns a raw path segment into an id, or `null` if it is not one (FE-9).
 *
 * `/candidates/abc` and `/candidates/-1` are rejected without a request — the
 * caller renders the not-found state instead. Mirrors the shipped
 * `parseRoleId` and `parseInterviewId`.
 */
export const parseCandidateId = (candidateId: string): number | null => {
  return /^\d+$/.test(candidateId) && Number(candidateId) > 0 ? Number(candidateId) : null;
};

/**
 * A `404` is the API's final answer on a candidate, so retrying one is pure
 * delay (FE-8, PERF-9, AC-F02).
 *
 * It matters more here than anywhere else in the app: for an interviewer a
 * `404` is also how the API says "outside your scope", and it will keep saying
 * it. Matches the shipped `useJobQuery` and `useInterviewerInterviewQuery`.
 */
const retryExceptNotFound = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
};

/**
 * A page of candidates, as a recruiter.
 *
 * `placeholderData` keeps the previous rows on screen while the next page or a
 * narrower search loads, so typing dims the table rather than flashing a
 * skeleton back at it (FE-10, PERF-8, AC-F14).
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
 * A page of the candidates this interviewer is assigned to.
 *
 * A separate hook from the recruiter's rather than one with a role flag, so the
 * two response types cannot be confused at a call site.
 */
export const useInterviewerCandidatesQuery = (params: CandidatesSearchParams) => {
  return useQuery({
    queryKey: candidatesListKey(params),
    queryFn: () => listInterviewerCandidates(params),
    placeholderData: (previous) => previous,
  });
};

/**
 * One candidate in full, as a recruiter.
 *
 * The list response is never used to seed this cache: the detail is often
 * reached by deep link or reload, with no list to have come from — and seeding
 * it would also mean trusting a cached row to decide what a fresh request would
 * have returned.
 */
export const useRecruiterCandidateQuery = (candidateId: number | null) => {
  return useQuery({
    // The `?? 0` is never used as a key — `enabled` is false whenever the id is
    // null (FE-9).
    queryKey: candidateDetailKey(candidateId ?? 0),
    queryFn: () => getRecruiterCandidate(candidateId as number),
    enabled: candidateId !== null,
    retry: retryExceptNotFound,
  });
};

/** One candidate and this interviewer's own rounds with them. */
export const useInterviewerCandidateQuery = (candidateId: number | null) => {
  return useQuery({
    queryKey: candidateDetailKey(candidateId ?? 0),
    queryFn: () => getInterviewerCandidate(candidateId as number),
    enabled: candidateId !== null,
    retry: retryExceptNotFound,
  });
};
