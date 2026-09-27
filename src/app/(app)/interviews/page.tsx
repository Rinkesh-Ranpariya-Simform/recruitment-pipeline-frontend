import { Suspense } from 'react';

import { ApplicationsTableSkeleton } from '@/features/applications/components/ApplicationsTableSkeleton';
import { InterviewProcessTable } from '@/features/applications/components/InterviewProcessTable';
import { RecruiterApplicationsView } from '@/features/applications/components/RecruiterApplicationsView';

/** Recruiter interviews page showing active interview candidates per requisition. */
export default function InterviewsPage() {
  return (
    // `useSearchParams()` requires a Suspense boundary — without one
    // `next build` fails, though `next dev` does not. The fallback is the
    // table's skeleton rather than a spinner, so the first paint is already
    // the right shape.
    <Suspense fallback={<ApplicationsTableSkeleton columns={6} />}>
      <RecruiterApplicationsView
        basePath="/interviews"
        title="Interviews"
        description="Candidates with at least one round scheduled. Open one to see its timeline and rounds."
        table={InterviewProcessTable}
        skeletonColumns={6}
        defaults={{ hasInterviews: true }}
        emptyMessage="No candidate is in an interview process yet."
        emptyHint="Start a phone screen from Applications to see someone here."
      />
    </Suspense>
  );
}
