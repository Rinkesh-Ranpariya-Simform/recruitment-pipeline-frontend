import { Suspense } from 'react';

import { RequireRole } from '@/features/auth/components/RequireRole';
import { InterviewsListView } from '@/features/interviews/components/InterviewsListView';
import { InterviewsTableSkeleton } from '@/features/interviews/components/InterviewsTable';
import { INTERVIEWS_RECRUITER_ROLES } from '@/features/interviews/permissions';

/**
 * The recruiter's list of every round.
 *
 * It carries its **own** `<RequireRole>`, narrower than the layout's: the
 * layout admits interviewers because the detail route below it serves them,
 * and this page does not. An interviewer who types `/interviews` gets the app's
 * 404 — their list is `/my-interviews`.
 *
 * `InterviewsListView` uses `useSearchParams()`, which requires a Suspense
 * boundary — without one `next build` fails, though `next dev` does not. The
 * fallback is the table's skeleton rather than a spinner, so the first paint is
 * already the right shape.
 */
export default function InterviewsPage() {
  return (
    <RequireRole allow={INTERVIEWS_RECRUITER_ROLES}>
      <Suspense fallback={<InterviewsTableSkeleton columns={6} />}>
        <InterviewsListView />
      </Suspense>
    </RequireRole>
  );
}
