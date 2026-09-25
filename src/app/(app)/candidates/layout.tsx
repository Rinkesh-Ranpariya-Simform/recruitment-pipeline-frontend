import { RequireRole } from '@/features/auth/components/RequireRole';
import { CANDIDATES_USER_ROLES } from '@/features/candidates/permissions';

/**
 * Gates `/candidates` and `/candidates/[candidateId]` in one place, rather than
 * each page repeating the guard (FR-1.1, FR-1.2).
 *
 * **It admits BOTH privileged roles**, unlike `/roles` and `/interviews` — and
 * that is the shape of this whole feature: one endpoint serves an interviewer
 * and a recruiter from two different projections, chosen by the server from the
 * verified token. A candidate who types either URL gets the app's 404 (FR-1.4,
 * EC-23).
 *
 * **A rendering decision, not a security control** (AZ-1). The API answers a
 * candidate's request here with `403`, and an interviewer's request for a
 * candidate they are not assigned to with a `404` produced by a query that
 * returned no row — whether or not this guard ever runs (AC-M03, AC-M06).
 */
export default function CandidatesLayout({ children }: LayoutProps<'/candidates'>) {
  return <RequireRole allow={CANDIDATES_USER_ROLES}>{children}</RequireRole>;
}
