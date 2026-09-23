import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { InterviewStatus } from './types';

/**
 * The URL is the source of truth for both interview lists' filters and page.
 * Reading and writing it lives here so the table, the filter and the pager
 * cannot disagree about the format — the same arrangement as
 * `features/roles/search-params.ts`.
 *
 * `roleId` and `applicationId` are **URL-only**: they exist so another surface
 * can deep-link into a scoped list ("the rounds on this requisition"), and
 * there is no control for them. `status` is the one filter with a visible
 * control, because it is the one an interviewer reaches for.
 */

export interface InterviewsSearchParams {
  status: InterviewStatus | undefined;
  roleId: number | undefined;
  applicationId: number | undefined;
  page: number;
}

const INTERVIEW_STATUSES: ReadonlyArray<InterviewStatus> = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

/**
 * Whether a string is a status this client recognises.
 *
 * Exported because the filter needs the same check — base-ui's `onValueChange`
 * hands back a widened `string | null`, and a second copy of the list would
 * eventually disagree with this one.
 */
export const isInterviewStatus = (value: string | null): value is InterviewStatus => {
  return value !== null && (INTERVIEW_STATUSES as ReadonlyArray<string>).includes(value);
};

/** A positive integer, or `undefined`. Shared by both id filters. */
const parseId = (raw: string | null): number | undefined => {
  const value = Number(raw);
  return raw !== null && Number.isInteger(value) && value > 0 ? value : undefined;
};

/**
 * Sanitises the query string before anything is requested.
 *
 * An unrecognised `status`, a non-numeric id and a `page` below 1 all become
 * absent, so `?status=BANANA&page=-2` renders the unfiltered first page rather
 * than the `400` the API would (rightly) answer. **Parameters are sanitised,
 * not forwarded.**
 */
export const parseInterviewsSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): InterviewsSearchParams => {
  const rawStatus = searchParams.get('status');
  const rawPage = Number(searchParams.get('page'));

  return {
    status: isInterviewStatus(rawStatus) ? rawStatus : undefined,
    roleId: parseId(searchParams.get('roleId')),
    applicationId: parseId(searchParams.get('applicationId')),
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Builds an href for either list. Every parameter is omitted at its default, so
 * the unfiltered first page is a bare `/interviews` rather than
 * `/interviews?page=1`.
 *
 * `basePath` rather than a hard-coded route: the interviewer's list lives at
 * `/my-interviews` and the recruiter's at `/interviews`, and they share this
 * whole parameter vocabulary.
 */
export const buildInterviewsHref = (
  basePath: string,
  { status, roleId, applicationId, page }: Partial<InterviewsSearchParams>,
): string => {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (roleId) {
    params.set('roleId', String(roleId));
  }

  if (applicationId) {
    params.set('applicationId', String(applicationId));
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
};
