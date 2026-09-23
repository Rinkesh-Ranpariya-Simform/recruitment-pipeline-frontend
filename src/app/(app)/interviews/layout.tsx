import { RequireRole } from '@/features/auth/components/RequireRole';
import { INTERVIEW_DETAIL_ROLES } from '@/features/interviews/permissions';

/**
 * Gates `/interviews` and `/interviews/[interviewId]` to the two privileged
 * roles. A candidate who types either URL gets the app's 404.
 *
 * **This is the wider of the two guards on purpose.** The detail route serves
 * both roles — the API returns two projections behind one endpoint — so the
 * layout cannot be recruiter-only without taking an interviewer's own rounds
 * away from them. `/interviews` itself narrows further, in its own page.
 *
 * A rendering decision, not a security control: the backend re-authorizes every
 * request, and an interviewer's by-id read of a round outside their own answers
 * 404 from a query that never loaded the row.
 */
export default function InterviewsLayout({ children }: LayoutProps<'/interviews'>) {
  return <RequireRole allow={INTERVIEW_DETAIL_ROLES}>{children}</RequireRole>;
}
