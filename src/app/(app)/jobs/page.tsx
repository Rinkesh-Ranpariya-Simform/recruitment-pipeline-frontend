import { Suspense } from 'react';

import { JobsListView } from '@/features/jobs/components/JobsListView';

/**
 * `JobsListView` reads `?q=` and `?page=` through `useSearchParams`, so it sits
 * behind a Suspense boundary — the same arrangement as `/login`.
 */
export default function JobsPage() {
  return (
    <Suspense>
      <JobsListView />
    </Suspense>
  );
}
