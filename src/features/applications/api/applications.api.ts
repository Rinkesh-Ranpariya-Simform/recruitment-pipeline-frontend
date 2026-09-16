import { apiFetch } from '@/lib/api';
import type { ApplicationResponse, ApplicationsListResponse } from '../types';

/**
 * Every application request the client makes — exactly two, matching the two
 * routes the API registers.
 *
 * There is deliberately **no `getApplication(id)`**. The backend registers no
 * such route, so a wrapper here would be a call that always 404s — and its
 * absence is what guarantees no candidate can request another's application by
 * id.
 */

/**
 * The caller's own applications. Scoping is the server's, from the token — this
 * sends no candidate identifier, because there is no parameter for one.
 */
export function listApplications(): Promise<ApplicationsListResponse> {
  return apiFetch<ApplicationsListResponse>('/api/applications');
}

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
export function createApplication(roleId: number): Promise<ApplicationResponse> {
  return apiFetch<ApplicationResponse>('/api/applications', {
    method: 'POST',
    body: { roleId },
  });
}
