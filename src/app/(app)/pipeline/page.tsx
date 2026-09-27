import { Suspense } from 'react';

import { PipelineBoardSkeleton } from '@/features/pipeline/components/PipelineRoleSection';
import { PipelineView } from '@/features/pipeline/components/PipelineView';

/** Pipeline board page wrapped in a Suspense boundary for search parameters. */
export default function PipelinePage() {
  return (
    <Suspense fallback={<PipelineBoardSkeleton />}>
      <PipelineView />
    </Suspense>
  );
}
