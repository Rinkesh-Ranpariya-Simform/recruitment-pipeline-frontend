import { Suspense } from 'react';

import { ApplicationsInboxTable } from '@/features/applications/components/ApplicationsInboxTable';
import { ApplicationsTableSkeleton } from '@/features/applications/components/ApplicationsTableSkeleton';
import { RecruiterApplicationsView } from '@/features/applications/components/RecruiterApplicationsView';

/** Recruiter applications list page displaying candidates who have applied across all roles. */
export default function ApplicationsPage() {
  return (
    // `useSearchParams()` requires a Suspense boundary — without one
    // `next build` fails, though `next dev` does not. The fallback is the
    // table's skeleton rather than a spinner, so the first paint is already
    // the right shape.
    <Suspense fallback={<ApplicationsTableSkeleton columns={4} />}>
      <RecruiterApplicationsView
        basePath="/applications"
        title="Applications"
        description="Everyone who has applied, across every requisition. Start a phone screen to move someone into an interview process."
        table={ApplicationsInboxTable}
        skeletonColumns={4}
        emptyMessage="Nobody has applied yet."
        emptyHint="Applications appear here as soon as candidates submit them."
      />
    </Suspense>
  );
}
