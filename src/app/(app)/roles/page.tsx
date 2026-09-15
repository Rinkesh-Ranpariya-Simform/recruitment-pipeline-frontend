import { Suspense } from 'react';

import { RolesListView } from '@/features/roles/components/RolesListView';
import { RolesTableSkeleton } from '@/features/roles/components/RolesTable';

/**
 * `RolesListView` uses `useSearchParams()`, which requires a Suspense boundary
 * — without one `next build` fails (though `next dev` doesn't).
 * `(auth)/login/page.tsx` wraps `LoginForm` for the same reason.
 *
 * The fallback is the table's skeleton rather than a spinner, so the first
 * paint is already the right shape.
 */
export default function RolesPage() {
  return (
    <Suspense fallback={<RolesTableSkeleton />}>
      <RolesListView />
    </Suspense>
  );
}
