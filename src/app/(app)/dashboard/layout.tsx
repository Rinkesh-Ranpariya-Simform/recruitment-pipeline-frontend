import { RequireRole } from '@/features/auth/components/RequireRole';
import { PIPELINE_USER_ROLES } from '@/features/pipeline/permissions';

/**
 * Gates `/dashboard` to recruiters, in the route layout rather than in the page
 * — matching `/audit`, `/roles` and `/pipeline` (FR-1.1). An interviewer or
 * candidate who types the URL gets the app's 404, not `/forbidden`:
 * `/forbidden` is reserved for a server refusal that `apiFetch` intercepted,
 * and conflating the two makes a routing decision look like an API one (AZ-3).
 *
 * **This is not the control.** `GET /api/pipeline/summary` answers a
 * non-recruiter `403` whether or not this guard exists (AZ-1, SEC-1). It
 * decides what renders, and nothing more.
 */
export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return <RequireRole allow={PIPELINE_USER_ROLES}>{children}</RequireRole>;
}
