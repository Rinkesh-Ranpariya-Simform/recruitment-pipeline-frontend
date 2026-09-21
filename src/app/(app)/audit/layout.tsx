import { RequireRole } from '@/features/auth/components/RequireRole';
import { AUDIT_USER_ROLES } from '@/features/audit/permissions';

/**
 * Gates `/audit` to recruiters, in the route layout rather than in the page —
 * matching `/roles` and `/jobs` (AZ-4). An interviewer or candidate who types
 * the URL gets the app's 404, not `/forbidden`: `/forbidden` is reserved for a
 * server refusal that `apiFetch` intercepted, and conflating the two makes a
 * routing decision look like an API one (AZ-3, FR-1.2).
 *
 * **Unlike the `/roles` guard, this one mirrors a real server refusal.** An
 * interviewer's `GET /api/roles` is a legitimate 200; their `GET /api/audit` is
 * a `403`. This still isn't the control — the 403 is (AZ-1, FR-1.4) — but a
 * non-recruiter who gets past this would learn nothing.
 */
export default function AuditLayout({ children }: LayoutProps<'/audit'>) {
  return <RequireRole allow={AUDIT_USER_ROLES}>{children}</RequireRole>;
}
