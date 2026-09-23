import { RequireRole } from '@/features/auth/components/RequireRole';
import { APPLICATIONS_ROLES } from '@/features/applications/permissions';

/**
 * Recruiters only, rendering the app's 404 for everyone else.
 *
 * **Narrowed from candidates-and-recruiters.** The route used to be one URL
 * with two projections behind it, chosen client-side; the candidate's half is
 * `/my-applications` now, so this tree answers one question for one audience —
 * who has applied to us.
 *
 * A candidate who follows a stale link here gets the app's 404 rather than
 * their own list, deliberately: silently rewriting the URL would hide that
 * their bookmark is out of date. `GET /api/applications` still answers an
 * interviewer `403`, and deliberately not an empty list — an empty response
 * would read as "no applications exist".
 */
export default function ApplicationsLayout({ children }: LayoutProps<'/applications'>) {
  return <RequireRole allow={APPLICATIONS_ROLES}>{children}</RequireRole>;
}
