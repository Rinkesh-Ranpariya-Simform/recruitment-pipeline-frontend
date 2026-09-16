import type { ReadonlyURLSearchParams } from 'next/navigation';

/**
 * The `/jobs` URL is the source of truth for the search term and the page.
 * Reading and writing it lives here so the list, the search box and the pager
 * can't disagree about the format — the same arrangement as
 * `features/roles/search-params.ts`.
 *
 * There is deliberately **no status parameter**. A candidate's response contains
 * only OPEN requisitions, enforced in the backend's query, so a status filter
 * would offer a choice with one option.
 */

export interface JobsSearchParams {
  q: string | undefined;
  page: number;
}

/** Matches the backend's cap on `q`, which is itself the cap on `Role.title`. */
const MAX_QUERY_LENGTH = 120;

/**
 * Sanitises the query string before anything is requested.
 *
 * A term that is blank after trimming becomes `undefined`, so `?q=` and no `q`
 * produce the same request — the backend treats them the same way, and a user
 * clearing the search box needs no special case. An over-long term is truncated
 * rather than sent, because the server would answer 400 and the user would have
 * no way to see why. A `page` that isn't an integer of at least 1 becomes 1.
 */
export const parseJobsSearchParams = (searchParams: ReadonlyURLSearchParams): JobsSearchParams => {
  const rawQuery = searchParams.get('q')?.trim() ?? '';
  const rawPage = Number(searchParams.get('page'));

  return {
    q: rawQuery === '' ? undefined : rawQuery.slice(0, MAX_QUERY_LENGTH),
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Builds a `/jobs` href. Both parameters are omitted at their defaults, so the
 * unsearched first page is a bare `/jobs` rather than `/jobs?page=1`.
 */
export const buildJobsHref = ({ q, page }: Partial<JobsSearchParams>): string => {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `/jobs?${query}` : '/jobs';
};
