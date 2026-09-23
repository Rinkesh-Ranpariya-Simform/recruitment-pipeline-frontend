import { apiFetch } from '@/lib/api';
import type { ApplicationsSearchParams } from '../search-params';
import type {
  ApplicationResponse,
  ApplicationsListResponse,
  RecruiterApplicationResponse,
  RecruiterApplicationsResponse,
} from '../types';

/**
 * Every application request the client makes, one function per endpoint per
 * projection. Components never assemble a path or a header themselves.
 *
 * **The two reads are two functions each, not one generic one**, because the
 * endpoint returns two different shapes depending on who is asking. A single
 * `listApplications<T>()` would let a caller name whichever type it felt like
 * and get no complaint from the compiler — which is the one mistake the
 * two-shape design exists to make impossible. The same construction as
 * `features/interviews/api/interviews.api.ts`.
 */

/**
 * Every parameter is omitted at its default, so the request matches the URL the
 * user sees. `parseApplicationsSearchParams` has already sanitised them, so a
 * `400` from here should be unreachable.
 *
 * `pageSize` is never sent — the page size is the server's default of 20 and is
 * not user-configurable.
 */
const applicationsPath = ({
  roleId,
  status,
  hasInterviews,
  page,
}: Partial<ApplicationsSearchParams> = {}): string => {
  const params = new URLSearchParams();

  if (roleId) {
    params.set('roleId', String(roleId));
  }

  if (status) {
    params.set('status', status);
  }

  if (hasInterviews !== undefined) {
    params.set('hasInterviews', hasInterviews ? 'true' : 'false');
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return `/api/applications${query ? `?${query}` : ''}`;
};

/**
 * The caller's own applications, as a CANDIDATE.
 *
 * Scoping is the server's, from the token — this sends no candidate identifier,
 * because there is no parameter for one, and it sends no filters either: a
 * candidate's list takes none.
 */
export const listApplications = (): Promise<ApplicationsListResponse> => {
  return apiFetch<ApplicationsListResponse>('/api/applications');
};

/** Every application, with its candidate and round count. The recruiter's projection. */
export const listRecruiterApplications = (
  params: Partial<ApplicationsSearchParams> = {},
): Promise<RecruiterApplicationsResponse> => {
  return apiFetch<RecruiterApplicationsResponse>(applicationsPath(params));
};

/**
 * One of the caller's own applications, as a CANDIDATE.
 *
 * A `404` here means the id is not one of theirs — **and the client cannot tell
 * whether that is because it does not exist or because it belongs to somebody
 * else.** The API answers both identically on purpose, so the caller renders one
 * not-found view and says nothing more.
 */
export const getApplication = (applicationId: number): Promise<ApplicationResponse> => {
  return apiFetch<ApplicationResponse>(`/api/applications/${applicationId}`);
};

/** One application in full, as a recruiter. A `404` here means there is no such application. */
export const getRecruiterApplication = (
  applicationId: number,
): Promise<RecruiterApplicationResponse> => {
  return apiFetch<RecruiterApplicationResponse>(`/api/applications/${applicationId}`);
};

/**
 * Applies to one open position. Sends `roleId` and **nothing else** — the
 * candidate, the status and the stage are all the server's to decide.
 *
 * Two failures are expected rather than exceptional, and callers are meant to
 * tell them apart:
 *
 * - **404** — the position is no longer open (or never existed; the API answers
 *   the same way for both, deliberately).
 * - **409 `ALREADY_APPLIED`** — this candidate already has an application to
 *   this role. One per candidate per position is a unique index in the database,
 *   so this is authoritative: no retry will turn it into a 201.
 *
 * A 404 is checked BEFORE a 409 on the server, so a repeat apply to a role that
 * has since closed reports the closure, not the duplicate.
 */
export const createApplication = (roleId: number): Promise<ApplicationResponse> => {
  return apiFetch<ApplicationResponse>('/api/applications', {
    method: 'POST',
    body: { roleId },
  });
};
