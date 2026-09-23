import type { UserRole } from '@/features/auth/types';

/**
 * Who the candidate portal is for. Read by the route guard on `/jobs`.
 *
 * It's an array because `<RequireRole allow>` takes one, and it lives here
 * rather than being inlined at the route for the same reason `ROLES_USER_ROLES`
 * does: a role should be named in one place. `/my-applications` deliberately
 * keeps its own array in `features/applications/permissions.ts` rather than
 * importing this one — the same role today, for a different reason.
 *
 * **This gates rendering, not access.** An interviewer's `GET /api/roles` is a
 * legitimate 200 — the backend allows it — and the reason they get the app's 404
 * on `/jobs` is that browsing adverts isn't their job, not that the API would
 * refuse them. The application endpoints, by contrast, really are candidate-only
 * server-side.
 */
export const CANDIDATE_USER_ROLES: ReadonlyArray<UserRole> = ['CANDIDATE'];
