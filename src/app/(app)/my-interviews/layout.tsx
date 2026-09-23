import { RequireRole } from '@/features/auth/components/RequireRole';
import { MY_INTERVIEWS_ROLES } from '@/features/interviews/permissions';

/**
 * Interviewer-only, across the list and the round page beneath it — closing the
 * same gap `/pipeline` had: the route was reachable by any authenticated user
 * who typed the URL.
 *
 * A rendering decision, not a security control — both queries behind this tree
 * are scoped server-side to the signed-in interviewer's own assignments.
 */
export default function MyInterviewsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={MY_INTERVIEWS_ROLES}>{children}</RequireRole>;
}
