import { Suspense } from 'react';

import { AuditTableSkeleton } from '@/features/audit/components/AuditTable';
import { AuditView } from '@/features/audit/components/AuditView';

/** Audit page wrapped in a Suspense boundary for search param handling. */
export default function AuditPage() {
  return (
    <Suspense fallback={<AuditTableSkeleton />}>
      <AuditView />
    </Suspense>
  );
}
