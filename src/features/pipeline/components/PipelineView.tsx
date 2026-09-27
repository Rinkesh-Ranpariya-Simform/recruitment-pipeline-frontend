'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PipelineDrillDown } from '@/features/candidates/components/PipelineDrillDown';
import { usePipelineQuery } from '../hooks/usePipelineQuery';
import {
  buildPipelineHref,
  hasActivePipelineFilters,
  parsePipelineSearchParams,
} from '../search-params';
import { PipelineFilters } from './PipelineFilters';
import { PipelineBoardSkeleton, PipelineRoleSection } from './PipelineRoleSection';

/** Whether the candidate drill-down list is available (controls stage card linking). */
const DRILL_DOWN_AVAILABLE = true;

interface EmptyStateProps {
  message: string;
  hint?: string;
  children?: React.ReactNode;
}

/** The shared frame for every empty and error state below. */
const EmptyState: React.FC<EmptyStateProps> = ({ message, hint, children }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{message}</p>
        {hint && <p className="max-w-md text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
};

/** Pipeline board page with role/stage filters and drill-down. */
export const PipelineView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sanitize URL params before making the request.
  const params = parsePipelineSearchParams(searchParams);

  const pipelineQuery = usePipelineQuery(params);

  const roles = pipelineQuery.data?.roles ?? [];
  const filtered = hasActivePipelineFilters(params);

  const clearFilters = () => router.push(buildPipelineHref({}));

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Candidate counts per stage per role, and how long they have been waiting.
        </p>
      </header>

      {/* Filters are always visible, even during loading/error states. */}
      <PipelineFilters params={params} roles={roles} />

      {pipelineQuery.isPending ? (
        <PipelineBoardSkeleton />
      ) : pipelineQuery.isError ? (
        <EmptyState message="Could not load the pipeline.">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void pipelineQuery.refetch()}
            disabled={pipelineQuery.isFetching}
          >
            {pipelineQuery.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </EmptyState>
      ) : roles.length === 0 ? (
        // Different empty states for "no filter matches" vs "no roles exist".
        filtered ? (
          <EmptyState message="No candidates match these filters.">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            message="No roles yet."
            hint="Open a requisition and the pipeline fills as people apply."
          >
            <Button variant="outline" size="sm" render={<Link href="/roles" />}>
              Create a role
            </Button>
          </EmptyState>
        )
      ) : (
        <div
          // Dims during filter transitions instead of showing a skeleton.
          className={
            pipelineQuery.isFetching ? 'flex flex-col gap-8 opacity-60' : 'flex flex-col gap-8'
          }
        >
          {roles.map((role) => (
            <PipelineRoleSection
              key={role.id}
              role={role}
              activeStage={params.stage}
              drillDownAvailable={DRILL_DOWN_AVAILABLE}
            />
          ))}
        </div>
      )}

      {/* Drill-down list — only rendered when both role and stage filters are set. */}
      {params.roleId !== undefined && params.stage !== undefined && (
        <PipelineDrillDown roleId={params.roleId} stage={params.stage} />
      )}
    </section>
  );
};
