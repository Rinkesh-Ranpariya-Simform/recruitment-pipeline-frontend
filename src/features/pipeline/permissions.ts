import type { UserRole } from '@/features/auth/types';

/**
 * Who the dashboard and the board are for. Read by the route guards in
 * `app/(app)/dashboard/layout.tsx` and `app/(app)/pipeline/layout.tsx`, and it
 * lives here rather than being inlined at each route so the role is named once.
 *
 * **Like `/audit` and unlike `/roles`, this one mirrors a real server refusal.**
 * All five pipeline endpoints answer an interviewer or a candidate `403`
 * whether or not this client ever calls them, and **that 403 is the control**
 * (AZ-1, SEC-1). This array only decides what renders — a non-recruiter who got
 * past it would see five failed requests and no data.
 *
 * There is no `canMoveCandidate(user)` helper beside it. Every control on these
 * screens is recruiter-only, so there is nothing on them conditional on a role
 * that the route guard does not already settle.
 */
export const PIPELINE_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];
