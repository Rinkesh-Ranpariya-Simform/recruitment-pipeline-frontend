'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import {
  getInterviewerInterview,
  getRecruiterInterview,
  listInterviewerInterviews,
} from '../api/interviews.api';
import type { InterviewsSearchParams } from '../search-params';

/**
 * The list query key, scoped by every filter and the page. All four come from
 * the URL, so changing any of them is an ordinary key change and Back works
 * with no extra cache handling.
 *
 * **Not keyed by role.** One session is one role, so the two projections can
 * never collide in a single cache — and keying by role would suggest a user can
 * switch, which this app has no mechanism for.
 */
export const interviewsListKey = ({
  status,
  roleId,
  applicationId,
  page,
}: InterviewsSearchParams) => {
  return ['interviews', 'list', { status, roleId, applicationId, page }] as const;
};

/** The prefix every list page shares — what a mutation invalidates. */
export const INTERVIEWS_LIST_KEY = ['interviews', 'list'] as const;

/** The key for one round. */
export const interviewDetailKey = (interviewId: number) => {
  return ['interviews', 'detail', interviewId] as const;
};

/** The prefix every detail shares, for a blanket invalidation after a write. */
export const INTERVIEWS_DETAIL_KEY = ['interviews', 'detail'] as const;

/**
 * Turns a raw path segment into an id, or `null` if it is not one.
 *
 * `/interviews/abc` and `/interviews/-1` are rejected without a request — the
 * caller renders the not-found state instead. Mirrors the shipped
 * `parseRoleId`.
 */
export const parseInterviewId = (interviewId: string): number | null => {
  return /^\d+$/.test(interviewId) && Number(interviewId) > 0 ? Number(interviewId) : null;
};

/**
 * A `404` is the API's final answer on a round, so retrying one is pure delay.
 *
 * This matters more here than anywhere else in the app: for an interviewer a
 * `404` is also how the API says "outside your scope", and it will keep saying
 * it. Matches the shipped `useJobQuery`.
 */
const retryExceptNotFound = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
};

/**
 * The signed-in interviewer's own rounds.
 *
 * `placeholderData` keeps the previous page on screen while the next one loads,
 * so paging dims the table rather than flashing a skeleton back at it.
 */
export const useInterviewerInterviewsQuery = (params: InterviewsSearchParams) => {
  return useQuery({
    queryKey: interviewsListKey(params),
    queryFn: () => listInterviewerInterviews(params),
    placeholderData: (previous) => previous,
  });
};

/**
 * **`useRecruiterInterviewsQuery` was removed by the applications feature.**
 *
 * `GET /api/interviews` still serves a recruiter's projection — the endpoint is
 * unchanged — but no screen asks for it any more: `/interviews` now lists the
 * candidates in a process, and a recruiter reaches a round through that
 * candidate's application. A hook nothing calls is a hook nobody maintains, so
 * it is gone rather than left as an invitation to build a second flat list. Its
 * `listRecruiterInterviews` counterpart went with it.
 */

/**
 * One round, as an interviewer.
 *
 * The list response is never used to seed this cache: the detail is often
 * reached by deep link or reload, with no list to have come from — and seeding
 * it would also mean trusting a cached row to decide what a fresh request would
 * have returned.
 */
export const useInterviewerInterviewQuery = (interviewId: number | null) => {
  return useQuery({
    // The `?? 0` is never used as a key — `enabled` is false whenever the id is
    // null.
    queryKey: interviewDetailKey(interviewId ?? 0),
    queryFn: () => getInterviewerInterview(interviewId as number),
    enabled: interviewId !== null,
    retry: retryExceptNotFound,
  });
};

/** One round, as a recruiter. */
export const useRecruiterInterviewQuery = (interviewId: number | null) => {
  return useQuery({
    queryKey: interviewDetailKey(interviewId ?? 0),
    queryFn: () => getRecruiterInterview(interviewId as number),
    enabled: interviewId !== null,
    retry: retryExceptNotFound,
  });
};
