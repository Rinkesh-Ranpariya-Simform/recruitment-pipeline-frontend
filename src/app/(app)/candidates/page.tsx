import { Suspense } from 'react';

import { CandidatesListView } from '@/features/candidates/components/CandidatesListView';
import { RecruiterCandidatesTableSkeleton } from '@/features/candidates/components/RecruiterCandidatesTable';

/** Candidates list page wrapped in a Suspense boundary for URL filter handling. */
export default function CandidatesPage() {
  return (
    <Suspense fallback={<RecruiterCandidatesTableSkeleton />}>
      <CandidatesListView />
    </Suspense>
  );
}
