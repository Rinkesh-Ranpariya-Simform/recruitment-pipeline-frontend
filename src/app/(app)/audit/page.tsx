import { Suspense } from 'react';

import { AuditTableSkeleton } from '@/features/audit/components/AuditTable';
import { AuditView } from '@/features/audit/components/AuditView';

/**
 * `AuditView` uses `useSearchParams()`, which requires a Suspense boundary —
 * without one `next build` fails, though `next dev` doesn't (FE-1).
 * `(app)/roles/page.tsx` wraps `RolesListView` for the same reason.
 *
 * The fallback is the table's skeleton rather than a spinner, so the first
 * paint is already the right shape.
 */
export default function AuditPage() {
  return (
    <Suspense fallback={<AuditTableSkeleton />}>
      <AuditView />
    </Suspense>
  );
}
