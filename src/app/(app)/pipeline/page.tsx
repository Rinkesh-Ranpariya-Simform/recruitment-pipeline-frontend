import { Suspense } from 'react';

import { PipelineBoardSkeleton } from '@/features/pipeline/components/PipelineRoleSection';
import { PipelineView } from '@/features/pipeline/components/PipelineView';

/**
 * `PipelineView` uses `useSearchParams()`, which requires a Suspense boundary —
 * **without one `next build` fails**, though `next dev` does not (FE-1).
 * `(app)/audit/page.tsx` and `(app)/roles/page.tsx` wrap their views for the
 * same reason.
 *
 * The fallback is the board's own skeleton rather than a spinner, so the first
 * paint is already the right shape.
 *
 * This **replaces** the placeholder that rendered the signed-in user's name and
 * was the recruiter's landing route; that landing is now `/dashboard`
 * (FR-1.2, FR-1.3).
 */
export default function PipelinePage() {
  return (
    <Suspense fallback={<PipelineBoardSkeleton />}>
      <PipelineView />
    </Suspense>
  );
}
