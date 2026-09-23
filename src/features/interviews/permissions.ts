import type { UserRole } from '@/features/auth/types';

/**
 * Who each interviews route is offered to. Read by the route guards in
 * `app/(app)/interviews/layout.tsx` and `app/(app)/interviews/page.tsx`, so the
 * roles are named once rather than inlined at each route.
 *
 * **Neither array is a control.** The backend re-authorizes every request:
 * scheduling, status changes and both assignment routes answer a non-recruiter
 * `403`, and an interviewer's by-id read of a round outside their own answers
 * `404` from a query that never loaded the row. These arrays only decide what
 * renders.
 */

/** The recruiter's list, and every write in this feature. */
export const INTERVIEWS_RECRUITER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];

/**
 * The shared detail route.
 *
 * **Both privileged roles reach it, and the API decides what each one sees** —
 * two projections behind one endpoint. Narrowing this array to recruiters would
 * take the interviewer's own rounds away from them; widening it to candidates
 * would render a page whose every request is a `403`.
 */
export const INTERVIEW_DETAIL_ROLES: ReadonlyArray<UserRole> = ['RECRUITER', 'INTERVIEWER'];

/** The interviewer's own landing route. */
export const MY_INTERVIEWS_ROLES: ReadonlyArray<UserRole> = ['INTERVIEWER'];
