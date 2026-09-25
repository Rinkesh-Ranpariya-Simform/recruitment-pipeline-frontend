import { apiFetch } from '@/lib/api';
import type { CandidatesSearchParams, RecruiterCandidatesSearchParams } from '../search-params';
import type {
  CandidateContactPatch,
  InterviewerCandidateResponse,
  InterviewerCandidatesResponse,
  RecruiterCandidateResponse,
  RecruiterCandidatesResponse,
} from '../types';

/**
 * Every candidates request the client makes. Components never assemble a path
 * or a header themselves (API-1, API-2).
 *
 * **The two reads are one function each per projection, not one generic
 * function per endpoint** — five in all, sharing one path builder. The endpoint
 * returns two different shapes depending on who is asking, and a single
 * `listCandidates<T>()` would let a caller name whichever type it felt like and
 * get no complaint from the compiler. That is the one mistake the two-shape
 * design exists to make impossible, and it is the reasoning `interviews.api.ts`
 * already records for the same situation. FE-2 counts three (one per endpoint);
 * this is a recorded deviation, and **what AC-F35 actually protects is
 * untouched: there is no `createCandidate` wrapper here and there must not be,
 * because there is no `POST /api/candidates`** (D-3, XBE-10, FR-11.4, SEC-7).
 *
 * `updateCandidateContact` is the only write, and it sends **three fields at
 * most** (XBE-4). There is no `deleteCandidate` either — the API has no such
 * path, and a GDPR-shaped anonymise is a real feature rather than a button.
 */

/**
 * The URL, built in exactly one place.
 *
 * `pageSize` is never sent — the page size is the server's default of 20 and is
 * not user-configurable. Every parameter is omitted at its default so the
 * request matches the URL the user sees (API-3).
 *
 * **`q` is typed as optional here and is supplied only by the recruiter's
 * call**, whose params type is the only one that has one. An interviewer's
 * params object carries no `q` at all, so there is no branch here that could
 * forget to drop it (API-4, VAL-5).
 */
const candidatesPath = ({
  q,
  roleId,
  stage,
  status,
  page,
}: Partial<RecruiterCandidatesSearchParams> = {}): string => {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (roleId) {
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

  return `/api/candidates${query ? `?${query}` : ''}`;
};

/**
 * Every candidate, with contact details and their applications.
 *
 * **One wrapper, three call sites** (API-7): `/candidates` itself, the
 * Applicants section on a role page (`{ roleId }` — the job → applicants step),
 * and the pipeline drill-down (`{ roleId, stage, status: 'ACTIVE' }`). A second
 * wrapper for either would be a second place to build this URL.
 */
export const listRecruiterCandidates = (
  params: Partial<RecruiterCandidatesSearchParams> = {},
): Promise<RecruiterCandidatesResponse> => {
  return apiFetch<RecruiterCandidatesResponse>(candidatesPath(params));
};

/**
 * The candidates this interviewer is assigned to — **name only**.
 *
 * **The scoping is the API's, not this call's.** There is no interviewer id in
 * the request: the server reads it from the verified token and puts the
 * assignment predicate into its own query. A candidate this caller has no round
 * with is never in the response, at any page, under any filter — and if one
 * ever appears, **that is a backend bug to report, not a row to filter here**
 * (XBE-1, AC-F03).
 */
export const listInterviewerCandidates = (
  params: Partial<CandidatesSearchParams> = {},
): Promise<InterviewerCandidatesResponse> => {
  return apiFetch<InterviewerCandidatesResponse>(candidatesPath(params));
};

/** One candidate in full, as a recruiter. A `404` means no such candidate. */
export const getRecruiterCandidate = (candidateId: number): Promise<RecruiterCandidateResponse> => {
  return apiFetch<RecruiterCandidateResponse>(`/api/candidates/${candidateId}`);
};

/**
 * One candidate and this interviewer's own rounds with them.
 *
 * A `404` here covers **three** causes — no such candidate, the id is not a
 * candidate, and "you are not assigned to them" — and the API makes them
 * byte-identical on purpose (XBE-9). **The client cannot distinguish them and
 * must not try**: the caller renders the not-found view and says nothing about
 * permissions (FR-7.4, FR-7.5, ERR-2).
 */
export const getInterviewerCandidate = (
  candidateId: number,
): Promise<InterviewerCandidateResponse> => {
  return apiFetch<InterviewerCandidateResponse>(`/api/candidates/${candidateId}`);
};

/**
 * Records a candidate's phone, location and/or headline. Recruiter-only.
 *
 * Sends **only what changed**, with an explicit `null` to clear a field and the
 * key omitted to leave it alone (API-5, XBE-5b, FR-8.3). The caller builds that
 * patch from the form; this sends exactly what it is given.
 *
 * It answers `200` with the **full recruiter detail**, which is why the
 * mutation writes the response straight into the detail cache rather than
 * refetching (XBE-11, FE-11, PERF-4).
 *
 * A body carrying `name` or `email` would answer `200` and change nothing — the
 * API drops them (XBE-4). `CandidateContactPatch` has no field for either, so
 * this client cannot send one to find out.
 */
export const updateCandidateContact = (
  candidateId: number,
  patch: CandidateContactPatch,
): Promise<RecruiterCandidateResponse> => {
  return apiFetch<RecruiterCandidateResponse>(`/api/candidates/${candidateId}`, {
    method: 'PATCH',
    body: patch,
  });
};
