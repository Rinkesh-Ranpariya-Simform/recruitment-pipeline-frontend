import { RequireRole } from '@/features/auth/components/RequireRole';
import { MY_APPLICATIONS_ROLES } from '@/features/applications/permissions';

/**
 * Candidate-only, across the list and the application page beneath it.
 *
 * **Split out of `/applications`, which is now the recruiter's inbox alone.**
 * The two audiences were one route with two projections behind it, decided by a
 * client-side dispatch; they are two routes now, for the same reason
 * `/my-interviews` is not `/interviews` — the question each asks is different
 * ("where did my applications get to?" against "who applied to us?"), and a
 * route that answers one of them should not have to ask who is reading it.
 *
 * A rendering decision, not a security control: `GET /api/applications` serves
 * the candidate projection off the verified token, and one candidate asking for
 * another's application by id gets a 404 from a query that never loaded the row.
 */
export default function MyApplicationsLayout({ children }: LayoutProps<'/my-applications'>) {
  return <RequireRole allow={MY_APPLICATIONS_ROLES}>{children}</RequireRole>;
}
