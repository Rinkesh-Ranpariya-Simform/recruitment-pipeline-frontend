import type { UserRole } from '@/features/auth/types';

/**
 * Who each applications route is offered to. Read by the route guards in
 * `app/(app)/applications/layout.tsx` and
 * `app/(app)/my-applications/layout.tsx`, so the roles are named once rather
 * than inlined at each route.
 *
 * **Neither array is a control.** The backend re-authorizes every request: an
 * interviewer is `403` on every applications endpoint, and a candidate asking
 * for another candidate's application by id gets a `404` from a query that never
 * loaded the row. These arrays only decide what renders.
 */

/**
 * `/applications` — **the recruiter's inbox, and theirs alone.**
 *
 * It used to admit candidates too, when one route served both audiences from
 * the same endpoint's two projections. Their half is `/my-applications` now, so
 * the split lives in the routing table rather than in a client-side dispatch.
 * Widening this to interviewers would render a page whose every request is a
 * `403`: their scope is the round they were assigned to, not a candidate's
 * whole process.
 */
export const APPLICATIONS_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];

/**
 * `/my-applications` and `/my-applications/:id` — candidates only.
 *
 * Deliberately not `CANDIDATE_USER_ROLES` from `features/jobs`: `/jobs` is
 * candidate-only because browsing adverts isn't anyone else's job, while these
 * routes are candidate-only because the API refuses everyone else. Two reasons
 * that happen to agree today, and merging them would hide that.
 */
export const MY_APPLICATIONS_ROLES: ReadonlyArray<UserRole> = ['CANDIDATE'];

/** The recruiter-only actions on those pages: starting a round, deciding one. */
export const APPLICATIONS_RECRUITER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];
