import { Suspense } from 'react';

import { MyInterviewsView } from '@/features/interviews/components/MyInterviewsView';
import { InterviewsTableSkeleton } from '@/features/interviews/components/InterviewsTable';

/**
 * The interviewer's landing route, and their own rounds.
 *
 * `MyInterviewsView` uses `useSearchParams()`, which requires a Suspense
 * boundary — without one `next build` fails, though `next dev` does not.
 *
 * The interviewer guard stays in this route's `layout.tsx`, unchanged.
 */
export default function MyInterviewsPage() {
  return (
    <Suspense fallback={<InterviewsTableSkeleton />}>
      <MyInterviewsView />
    </Suspense>
  );
}
