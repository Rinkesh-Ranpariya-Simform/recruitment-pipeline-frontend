import { RequireRole } from '@/features/auth/components/RequireRole';
import { INTERVIEWS_RECRUITER_ROLES } from '@/features/interviews/permissions';

/**
 * Gates the whole `/interviews` tree — the list, a candidate's process and one
 * round of it — to recruiters.
 *
 * **It used to admit interviewers too, and no longer does.** The round page
 * below is nested under the application it belongs to, and an interviewer's
 * payload carries no application id: the backend's interviewer projection
 * selects none, so they could not build a URL in this tree even if they were
 * let into it. Their own round page is `/my-interviews/:interviewId`, reached
 * from the list that is already their landing route, and it renders the
 * interviewer projection of the very same endpoint.
 *
 * A rendering decision, not a security control: the backend re-authorizes every
 * request, and an interviewer's by-id read of a round outside their own answers
 * 404 from a query that never loaded the row.
 */
export default function InterviewsLayout({ children }: LayoutProps<'/interviews'>) {
  return <RequireRole allow={INTERVIEWS_RECRUITER_ROLES}>{children}</RequireRole>;
}
