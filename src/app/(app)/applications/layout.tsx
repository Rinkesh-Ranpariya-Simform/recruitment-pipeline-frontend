import { RequireRole } from '@/features/auth/components/RequireRole';
import { CANDIDATE_USER_ROLES } from '@/features/jobs/permissions';

/**
 * Candidate-only, rendering the app's 404 for anyone else.
 *
 * Unlike `/jobs`, this one matches the API exactly: both application endpoints
 * answer an interviewer or recruiter with a 403, and deliberately not an empty
 * list — an empty response would read as "no applications exist".
 */
export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={CANDIDATE_USER_ROLES}>{children}</RequireRole>;
}
