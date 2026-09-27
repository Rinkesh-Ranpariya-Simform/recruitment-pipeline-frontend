import type { UserRole } from '@/features/auth/types';

/** User roles authorized to access and view audit logs. */
export const AUDIT_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER'];
