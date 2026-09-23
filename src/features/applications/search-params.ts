import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { ApplicationStatus } from './types';

/**
 * The URL is the source of truth for the RECRUITER applications list's filters
 * and page. Reading and writing it lives here so the table, the filters and the
 * pager cannot disagree about the format — the same arrangement as
 * `features/interviews/search-params.ts`.
 *
 * **The candidate's list has no search params at all** and never reaches this
 * file: their list is their own, is short, and takes no filters.
 *
 * `hasInterviews` is the parameter that makes one endpoint serve two tabs:
 *
 * - `/applications` — every application, unfiltered, where a recruiter starts a
 *   phone screen.
 * - `/interviews` — `hasInterviews=true`, the candidates already in process.
 *
 * It is a route default rather than a visible control on either page, which is
 * why `buildApplicationsHref` takes a `basePath`: the two tabs share this whole
 * parameter vocabulary and differ only in where they point.
 */

export interface ApplicationsSearchParams {
  roleId: number | undefined;
  status: ApplicationStatus | undefined;
  /** `undefined` means "do not filter", which is not the same as `false`. */
  hasInterviews: boolean | undefined;
  page: number;
}

const APPLICATION_STATUSES: ReadonlyArray<ApplicationStatus> = ['ACTIVE', 'HIRED', 'REJECTED'];

/**
 * Whether a string is a status this client recognises.
 *
 * Exported because the filter control needs the same check — base-ui's
 * `onValueChange` hands back a widened `string | null`, and a second copy of the
 * list would eventually disagree with this one.
 */
export const isApplicationStatus = (value: string | null): value is ApplicationStatus => {
  return value !== null && (APPLICATION_STATUSES as ReadonlyArray<string>).includes(value);
};

/** A positive integer, or `undefined`. */
const parseId = (raw: string | null): number | undefined => {
  const value = Number(raw);
  return raw !== null && Number.isInteger(value) && value > 0 ? value : undefined;
};

/**
 * Sanitises the query string before anything is requested.
 *
 * An unrecognised `status`, a non-numeric `roleId` and a `page` below 1 all
 * become absent, so `?status=BANANA&page=-2` renders the unfiltered first page
 * rather than the `400` the API would (rightly) answer. **Parameters are
 * sanitised, not forwarded.**
 *
 * `defaults` lets a route pin a parameter the URL does not carry — `/interviews`
 * passes `{ hasInterviews: true }` — while still letting the URL override it, so
 * a deep link stays honest about what it is showing.
 */
export const parseApplicationsSearchParams = (
  searchParams: ReadonlyURLSearchParams,
  defaults: Partial<ApplicationsSearchParams> = {},
): ApplicationsSearchParams => {
  const rawStatus = searchParams.get('status');
  const rawPage = Number(searchParams.get('page'));
  const rawHasInterviews = searchParams.get('hasInterviews');

  return {
    roleId: parseId(searchParams.get('roleId')) ?? defaults.roleId,
    status: isApplicationStatus(rawStatus) ? rawStatus : defaults.status,
    hasInterviews:
      rawHasInterviews === 'true'
        ? true
        : rawHasInterviews === 'false'
          ? false
          : defaults.hasInterviews,
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Builds an href for either tab. Every parameter is omitted at its default, so
 * the unfiltered first page is a bare `/applications` rather than
 * `/applications?page=1`.
 *
 * `omit` names the parameters a route pins itself and therefore must not write
 * into its own links — `/interviews` omits `hasInterviews`, because putting
 * `?hasInterviews=true` in every one of its links would spell out a fact the
 * route already carries.
 */
export const buildApplicationsHref = (
  basePath: string,
  { roleId, status, hasInterviews, page }: Partial<ApplicationsSearchParams>,
  omit: ReadonlyArray<keyof ApplicationsSearchParams> = [],
): string => {
  const params = new URLSearchParams();

  if (roleId && !omit.includes('roleId')) {
    params.set('roleId', String(roleId));
  }

  if (status && !omit.includes('status')) {
    params.set('status', status);
  }

  if (hasInterviews !== undefined && !omit.includes('hasInterviews')) {
    params.set('hasInterviews', hasInterviews ? 'true' : 'false');
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
};
