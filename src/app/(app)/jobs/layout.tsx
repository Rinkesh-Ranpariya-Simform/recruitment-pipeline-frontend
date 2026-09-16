import { RequireRole } from '@/features/auth/components/RequireRole';
import { CANDIDATE_USER_ROLES } from '@/features/jobs/permissions';

/**
 * Both jobs routes are candidate-only in the UI, so the guard lives here rather
 * than being repeated on the list and the detail page.
 *
 * A recruiter or interviewer gets **the app's 404**, not `/forbidden`: a route
 * you may not open should look like a route that isn't there.
 *
 * This is a rendering decision, not a security control. The API would in fact
 * answer an interviewer's `GET /api/roles` with a 200 — browsing adverts simply
 * isn't their job. The application endpoints behind the Apply button are the
 * ones that are candidate-only server-side.
 */
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={CANDIDATE_USER_ROLES}>{children}</RequireRole>;
}
