import type { User, UserRole } from '@/features/auth/types';

/**
 * Who this feature is for.
 *
 * **Both privileged roles reach both routes, and the API decides what each
 * sees** (FR-1.1, FR-1.2, AZ-2). This is not the usual "whose job is this
 * page?" guard: `/candidates` genuinely serves an interviewer, with a narrower
 * payload chosen by the server from the verified token. A candidate gets the
 * app's 404 here and a `403` from the API behind it.
 *
 * Read by both route layouts and by the nav table, so the three cannot drift.
 * It is an array because `<RequireRole allow>` takes one.
 */
export const CANDIDATES_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER', 'INTERVIEWER'];

/** Only a recruiter has a candidate list with contact columns and a search box. */
const RECRUITER_ONLY: ReadonlyArray<UserRole> = ['RECRUITER'];

/**
 * Whether to render the recruiter surfaces: the contact columns, the search
 * box, the contact dialog and the Applicants section on a role page.
 *
 * **Every one of those is an affordance, not a control** (AZ-1, SEC-6). The
 * API answers an interviewer's `PATCH` with `403` and their `?q=` with `400`
 * whether or not this function is ever called — AC-M03 and AC-M04 prove it from
 * the DevTools console.
 *
 * It is a separate question from `CANDIDATES_USER_ROLES` above, and that is the
 * point: an interviewer may open these routes, and still may not do these
 * things.
 */
export const canManageCandidateContacts = (user: User | null): boolean => {
  return user !== null && RECRUITER_ONLY.includes(user.role);
};
