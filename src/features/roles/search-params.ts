import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { RoleStatus } from './types';

/**
 * The `/roles` URL is the source of truth for the filter and the page. Reading
 * and writing it live here so the list view, the filter and the pager can't
 * disagree about the format.
 */

export interface RolesSearchParams {
  status: RoleStatus | undefined;
  page: number;
}

const ROLE_STATUSES: ReadonlyArray<RoleStatus> = ['OPEN', 'CLOSED'];

/**
 * Whether a string is a status this client recognises.
 *
 * Exported because the filter needs the same check — base-ui's `onValueChange`
 * hands back a widened `string | null`, and a second copy of the list would
 * eventually disagree with this one.
 */
export const isRoleStatus = (value: string | null): value is RoleStatus => {
  return value !== null && (ROLE_STATUSES as ReadonlyArray<string>).includes(value);
};

/**
 * Sanitises the query string before anything is requested.
 *
 * An unrecognised `status` becomes no filter, and a `page` that isn't an
 * integer of at least 1 becomes page 1. The server would answer either with a
 * 400, so a mistyped URL renders a working page instead of an error.
 */
export const parseRolesSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): RolesSearchParams => {
  const rawStatus = searchParams.get('status');
  const rawPage = Number(searchParams.get('page'));

  return {
    status: isRoleStatus(rawStatus) ? rawStatus : undefined,
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Builds a `/roles` href. Both parameters are omitted at their defaults, so the
 * unfiltered first page is a bare `/roles` rather than `/roles?page=1`.
 */
export const buildRolesHref = ({ status, page }: Partial<RolesSearchParams>): string => {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `/roles?${query}` : '/roles';
};
