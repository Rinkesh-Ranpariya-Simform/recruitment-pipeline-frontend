import type { User, UserRole } from '@/features/auth/types';

/**
 * Who the roles feature is for. Both the route guard in
 * `app/(app)/roles/layout.tsx` and `canManageRoles` below read this, so the
 * two can't drift. It's an array because `<RequireRole allow>` takes one.
 */
export const ROLES_USER_ROLES: readonly UserRole[] = ['RECRUITER'];

/**
 * Whether to show the write controls: New role, Edit, and the status action.
 *
 * Roles are recruiter-only end to end, so this is currently true for anyone who
 * can reach a roles page at all — the layout guard already turned interviewers
 * away. It stays because each control should ask its own question rather than
 * depend on a guard in another file.
 *
 * Hiding a button is not what protects the endpoint: the backend answers an
 * interviewer's `POST /api/roles` with a 403 regardless.
 */
export function canManageRoles(user: User | null): boolean {
  return user !== null && ROLES_USER_ROLES.includes(user.role);
}
