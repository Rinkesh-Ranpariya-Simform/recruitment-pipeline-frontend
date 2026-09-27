import type { UserRole } from './types';

/** Default landing route for each user role upon login. */
const ROLE_LANDING: Record<UserRole, string> = {
  RECRUITER: '/dashboard',
  INTERVIEWER: '/my-interviews',
  CANDIDATE: '/jobs',
};

/** Determines safe destination path after login, preventing open redirect vulnerabilities. */
export const resolveRedirect = (next: string | null | undefined, role: UserRole): string => {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  return ROLE_LANDING[role];
};
