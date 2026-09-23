'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import {
  getApplication,
  getRecruiterApplication,
  listApplications,
  listRecruiterApplications,
} from '../api/applications.api';
import type { ApplicationsSearchParams } from '../search-params';

/**
 * The one candidate applications key, shared by `/my-applications` and by the job
 * detail page's "you already applied" line.
 *
 * Sharing it is deliberate: arriving at a job page from My applications then
 * costs **zero** extra requests, and one invalidation after an apply updates
 * both places. Giving the job page its own key would double the requests and let
 * the two views disagree about the same list.
 */
export const APPLICATIONS_LIST_KEY = ['applications', 'list'] as const;

export const useApplicationsQuery = () => {
  return useQuery({
    queryKey: APPLICATIONS_LIST_KEY,
    queryFn: listApplications,
  });
};

/**
 * The recruiter list's key, scoped by every filter and the page. All four come
 * from the URL, so changing any of them is an ordinary key change and Back works
 * with no extra cache handling.
 *
 * **A different prefix from the candidate list**, not a variant of it: the two
 * hold different shapes, and one key serving both would mean a cached candidate
 * list satisfying a recruiter's query. One session is one role so that could not
 * happen today — the separation is here so it cannot start to.
 */
export const recruiterApplicationsListKey = ({
  roleId,
  status,
  hasInterviews,
  page,
}: ApplicationsSearchParams) => {
  return ['applications', 'recruiter-list', { roleId, status, hasInterviews, page }] as const;
};

/** The prefix every recruiter list page shares — what a mutation invalidates. */
export const RECRUITER_APPLICATIONS_LIST_KEY = ['applications', 'recruiter-list'] as const;

/** The key for one application's detail, either audience. */
export const applicationDetailKey = (applicationId: number) => {
  return ['applications', 'detail', applicationId] as const;
};

/** The prefix every detail shares, for a blanket invalidation after a write. */
export const APPLICATIONS_DETAIL_KEY = ['applications', 'detail'] as const;

/**
 * Turns a raw path segment into an id, or `null` if it is not one.
 *
 * `/my-applications/abc` and `/my-applications/-1` are rejected without a
 * request — the caller renders the not-found state instead. Mirrors the shipped
 * `parseRoleId` and `parseInterviewId`.
 */
export const parseApplicationId = (applicationId: string): number | null => {
  return /^\d+$/.test(applicationId) && Number(applicationId) > 0 ? Number(applicationId) : null;
};

/**
 * A `404` is the API's final answer on an application, so retrying one is pure
 * delay.
 *
 * For a candidate a `404` is also how the API says "not yours", and it will keep
 * saying it. Matches the shipped `useJobQuery` and `useInterviewsQuery`.
 */
const retryExceptNotFound = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
};

/**
 * Every application, filtered and paged.
 *
 * `placeholderData` keeps the previous page on screen while the next one loads,
 * so paging dims the table rather than flashing a skeleton back at it.
 */
export const useRecruiterApplicationsQuery = (params: ApplicationsSearchParams) => {
  return useQuery({
    queryKey: recruiterApplicationsListKey(params),
    queryFn: () => listRecruiterApplications(params),
    placeholderData: (previous) => previous,
  });
};

/**
 * One of the caller's own applications, as a candidate.
 *
 * The list response is never used to seed this cache: the detail is often
 * reached by deep link or reload, with no list to have come from — and seeding
 * it would also mean trusting a cached row to decide what a fresh request would
 * have returned.
 */
export const useApplicationQuery = (applicationId: number | null) => {
  return useQuery({
    // The `?? 0` is never used as a key — `enabled` is false whenever the id is
    // null.
    queryKey: applicationDetailKey(applicationId ?? 0),
    queryFn: () => getApplication(applicationId as number),
    enabled: applicationId !== null,
    retry: retryExceptNotFound,
  });
};

/** One application in full, as a recruiter. */
export const useRecruiterApplicationQuery = (applicationId: number | null) => {
  return useQuery({
    queryKey: applicationDetailKey(applicationId ?? 0),
    queryFn: () => getRecruiterApplication(applicationId as number),
    enabled: applicationId !== null,
    retry: retryExceptNotFound,
  });
};
