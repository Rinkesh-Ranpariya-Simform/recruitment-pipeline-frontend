import { Suspense } from 'react';

import { CandidatesListView } from '@/features/candidates/components/CandidatesListView';
import { RecruiterCandidatesTableSkeleton } from '@/features/candidates/components/RecruiterCandidatesTable';

/**
 * `CandidatesListView` reads `useSearchParams()`, which requires a Suspense
 * boundary — **without one `next build` fails**, though `next dev` does not
 * (FE-1). `(app)/pipeline/page.tsx`, `(app)/audit/page.tsx` and
 * `(app)/roles/page.tsx` wrap their views for the same reason.
 *
 * The fallback is the recruiter's table skeleton rather than a spinner, so the
 * first paint is already roughly the right shape. It is the wider of the two —
 * an interviewer sees one column — and picking the narrower one would make the
 * recruiter's page jump rather than settle.
 */
export default function CandidatesPage() {
  return (
    <Suspense fallback={<RecruiterCandidatesTableSkeleton />}>
      <CandidatesListView />
    </Suspense>
  );
}
