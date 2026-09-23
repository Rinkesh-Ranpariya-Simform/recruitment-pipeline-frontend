import { Suspense } from 'react';

import { ApplicationsInboxTable } from '@/features/applications/components/ApplicationsInboxTable';
import { ApplicationsTableSkeleton } from '@/features/applications/components/ApplicationsTableSkeleton';
import { RecruiterApplicationsView } from '@/features/applications/components/RecruiterApplicationsView';

/**
 * `/applications` — **everyone who has applied**, across every requisition
 * (applications FR-1.1).
 *
 * The recruiter's entry point into a hire: a row here is someone who applied
 * and has not been called yet, and its action starts the phone screen that
 * moves them into `/interviews`. Which is why this is the same component
 * `/interviews` renders, with a different table and no pinned filter — the two
 * lists are one query with one filter between them.
 *
 * The candidate's own list is no longer this route; it is `/my-applications`,
 * and the two no longer share a dispatch.
 */
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
