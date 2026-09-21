import type { UserRole } from '@/features/auth/types';

/**
 * Who the audit feed is for. Read by the route guard in
 * `app/(app)/audit/layout.tsx`, and it lives here rather than being inlined at
 * the route for the same reason `ROLES_USER_ROLES` does: a role should be named
 * in one place.
 *
 * **Unlike `/jobs` and `/roles`, this one really is refused server-side.** An
 * interviewer's `GET /api/roles` is a legitimate 200 and the 404 they get on
 * `/roles` is a judgement about whose job it is; `GET /api/audit` answers an
 * interviewer or a candidate `403` whether or not this client ever calls it,
 * and **that 403 is the control** (AZ-1, SEC-1). This array only decides what
 * renders.
 *
 * There is no `canReadAudit(user)` helper beside it, because nothing on this
 * screen is conditional on a role: there is one route, one guard, and no write
 * controls to hide.
 */
export const AUDIT_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];
