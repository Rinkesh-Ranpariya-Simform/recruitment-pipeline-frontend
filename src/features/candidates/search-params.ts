import type { ReadonlyURLSearchParams } from 'next/navigation';

import { isPipelineStage } from '@/features/pipeline/search-params';
import type { ApplicationStatus, PipelineStage } from './types';

/**
 * The `/candidates` URL is the source of truth for every filter and the page,
 * so a list a recruiter is looking at is a list they can send to someone.
 * Reading and writing it lives here so the filter bar, the table and the pager
 * cannot disagree about the format — the same arrangement as
 * `features/roles/search-params.ts` and `features/pipeline/search-params.ts`.
 *
 * **There are two parsers, not one with a flag** (VAL-5, API-4, FR-3.2). The
 * interviewer's drops `q` entirely, so even a hand-edited `?q=john` produces a
 * request without it and the API's `400` is never provoked by this client
 * (EC-03, AC-F07). It is a structural omission rather than a conditional: the
 * interviewer's params type has no `q` field, so nothing downstream can send
 * one.
 *
 * `isPipelineStage` is imported from the pipeline feature rather than copied.
 * A second list of the four stages would eventually disagree with the first.
 */

/** The longest search term this client will put in the URL (VAL-3). */
const MAX_SEARCH_LENGTH = 120;

const APPLICATION_STATUSES: ReadonlyArray<ApplicationStatus> = ['ACTIVE', 'HIRED', 'REJECTED'];

/**
 * Whether a string is an application status this client recognises.
 *
 * Exported because the filter select needs the same check — base-ui's
 * `onValueChange` hands back a widened `string | null`, and a second copy of
 * the list would eventually disagree with this one.
 */
export const isApplicationStatus = (value: string | null): value is ApplicationStatus => {
  return value !== null && (APPLICATION_STATUSES as ReadonlyArray<string>).includes(value);
};

/** The order the status select offers. */
export const APPLICATION_STATUS_VALUES = APPLICATION_STATUSES;

/** Everything both roles may filter by. */
export interface CandidatesSearchParams {
  roleId: number | undefined;
  stage: PipelineStage | undefined;
  status: ApplicationStatus | undefined;
  page: number;
}

/**
 * A recruiter's params: the above, **plus the search term**.
 *
 * `q` lives only here. The interviewer's type has no such field, which is what
 * makes "this client never sends `q` as an interviewer" a property of the types
 * rather than of a runtime check somebody has to remember (API-4).
 */
export interface RecruiterCandidatesSearchParams extends CandidatesSearchParams {
  q: string | undefined;
}

const parseShared = (searchParams: ReadonlyURLSearchParams): CandidatesSearchParams => {
  const rawRoleId = Number(searchParams.get('roleId'));
  const rawPage = Number(searchParams.get('page'));

  return {
    roleId: Number.isInteger(rawRoleId) && rawRoleId >= 1 ? rawRoleId : undefined,
    stage: isPipelineStage(searchParams.get('stage'))
      ? (searchParams.get('stage') as PipelineStage)
      : undefined,
    status: isApplicationStatus(searchParams.get('status'))
      ? (searchParams.get('status') as ApplicationStatus)
      : undefined,
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Sanitises the query string before anything is requested (VAL-4, EC-22).
 *
 * An unrecognised `stage` or `status` becomes no filter, a non-positive
 * `roleId` is dropped, and a `page` that is not an integer of at least 1
 * becomes page 1 — so `?stage=BANANA&page=-2` from a stale bookmark renders the
 * **unfiltered first page** rather than the `400` the API would rightly answer.
 * **The client does not forward garbage to earn an error it can predict.**
 *
 * `q` is trimmed and capped at 120 to match the API's own rule, and an empty
 * term becomes `undefined` so `?q=` is an unfiltered list rather than a search
 * for nothing (VAL-3).
 */
export const parseRecruiterCandidatesSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): RecruiterCandidatesSearchParams => {
  const rawQ = searchParams.get('q')?.trim().slice(0, MAX_SEARCH_LENGTH) ?? '';

  return { ...parseShared(searchParams), q: rawQ === '' ? undefined : rawQ };
};

/**
 * The interviewer's parser. **It does not read `q` at all** (VAL-5, API-4).
 *
 * Not "reads it and ignores it" — the returned object has no field for one, so
 * there is nowhere for a search term to survive to. An interviewer who types
 * `?q=john` into the address bar gets an ordinary `200` (EC-03, AC-F07).
 */
export const parseInterviewerCandidatesSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): CandidatesSearchParams => {
  return parseShared(searchParams);
};

/**
 * Builds a `/candidates` href. Every parameter is omitted at its default, so
 * the unfiltered first page is a bare `/candidates` rather than
 * `/candidates?page=1` — matching `buildRolesHref` and `buildPipelineHref`.
 */
export const buildCandidatesHref = ({
  q,
  roleId,
  stage,
  status,
  page,
}: Partial<RecruiterCandidatesSearchParams>): string => {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (roleId && roleId > 0) {
    params.set('roleId', String(roleId));
  }

  if (stage) {
    params.set('stage', stage);
  }

  if (status) {
    params.set('status', status);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `/candidates?${query}` : '/candidates';
};

/**
 * Whether anything is narrowing the list. Drives the Clear filters button and
 * the choice between the two empty states — telling a recruiter "no candidates
 * match these filters" when they have set none is the one thing an empty list
 * must not say (FR-2.6).
 */
export const hasActiveCandidateFilters = ({
  q,
  roleId,
  stage,
  status,
}: Partial<RecruiterCandidatesSearchParams>): boolean => {
  return q !== undefined || roleId !== undefined || stage !== undefined || status !== undefined;
};

/* -------------------------------------------------------------------------
 * The Applicants section's own page parameter (FR-9.4)
 * ---------------------------------------------------------------------- */

/**
 * The Applicants section on `/roles/[roleId]` pages **independently** of the
 * roles list, under its own `applicantsPage` key (FR-9.4, EC-19).
 *
 * Sharing `page` would mean paging applicants also paged the list a recruiter
 * came from, so Back would land somewhere they never were.
 */
export const parseApplicantsPage = (searchParams: ReadonlyURLSearchParams): number => {
  const raw = Number(searchParams.get('applicantsPage'));

  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
};

/**
 * Builds a `/roles/:roleId` href that changes **only** `applicantsPage`.
 *
 * Every other parameter already in the URL is preserved verbatim, so paging
 * applicants disturbs nothing else a recruiter had set (EC-19, AC-F40).
 */
export const buildApplicantsHref = (
  roleId: number,
  searchParams: ReadonlyURLSearchParams,
  page: number,
): string => {
  const params = new URLSearchParams(searchParams.toString());

  if (page > 1) {
    params.set('applicantsPage', String(page));
  } else {
    params.delete('applicantsPage');
  }

  const query = params.toString();

  return query ? `/roles/${roleId}?${query}` : `/roles/${roleId}`;
};
