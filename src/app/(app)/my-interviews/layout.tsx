import { RequireRole } from '@/features/auth/components/RequireRole';

/**
 * Interviewer-only, closing the same gap `/pipeline` had: the route was
 * reachable by any authenticated user who typed the URL.
 *
 * A rendering decision, not a security control — the assigned-rounds query
 * behind this page is scoped server-side.
 */
export default function MyInterviewsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={['INTERVIEWER']}>{children}</RequireRole>;
}
