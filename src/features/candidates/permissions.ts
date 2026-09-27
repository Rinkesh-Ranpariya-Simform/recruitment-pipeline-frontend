import type { User, UserRole } from '@/features/auth/types';

/**
 * Roles permitted to access the candidates feature.
 * Both recruiters and interviewers can access candidates, with role-specific views and data.
 */
export const CANDIDATES_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER', 'INTERVIEWER'];

/** Roles permitted to manage candidate contact information. */
const RECRUITER_ONLY: ReadonlyArray<UserRole> = ['RECRUITER'];

/**
 * Checks whether the current user has permission to view and edit candidate contact details.
 * Restricted to recruiters.
 */
export const canManageCandidateContacts = (user: User | null): boolean => {
  return user !== null && RECRUITER_ONLY.includes(user.role);
};
