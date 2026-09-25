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

/**
 * Whether `GET /api/candidates` exists yet (FR-4.2, EC-13).
 *
 * **It does now.** This was `false` while the drill-down waited on the
 * candidate-access feature, and that feature is the one flipping it — along
 * with rendering the list itself, below. Stage cards with a non-zero count are
 * links again; **a zero-count card is still not one** (FR-3.7, AC-F13 in the
 * pipeline spec, which remains true), because offering to show a recruiter an
 * empty list is an invitation to a dead end.
 *
 * The constant stays rather than being deleted: it is what
 * `PipelineStageCard` takes, and one named switch is clearer than four call
 * sites each deciding for themselves.
 */
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

/**
 * The `/pipeline` screen: filters, the board, and every state they can be in.
 *
 * **The only component in this feature that reads `useSearchParams()`** (FE-1,
 * AC-F30) — which is why the route above it supplies the Suspense boundary,
 * without which `next build` fails even though `next dev` does not.
 *
 * Only recruiters get here: `(app)/pipeline/layout.tsx` shows everyone else the
 * app's 404 before this mounts. **That guard is not what protects the data** —
 * `GET /api/pipeline` answers a non-recruiter `403` whether or not this
 * component ever runs (AZ-1, SEC-1), which AC-M02 proves from the console.
 *
 * **One request on mount, one per filter change** (PERF-2). There is no call
 * per role, none per stage, and nothing here fetches candidates to compute a
 * count or an age — both come from the aggregate, which is the whole reason the
 * aggregate exists (FR-8.3).
 */
export const PipelineView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sanitised before anything is requested, so `?stage=BANANA&roleId=-1`
  // renders the unfiltered board instead of the 400 the API would rightly
  // answer (VAL-4, EC-10, AC-F17).
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

      {/* Always rendered, in every state below — including the error ones. A
          recruiter whose request failed should not also lose the filter they
          set (ERR-1), and the bar stays usable while the first board loads. */}
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
        // Two empty states, and they are not interchangeable. Telling a
        // recruiter "no candidates match these filters" when they have set none
        // is how an empty board becomes indistinguishable from a broken one.
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
          // Dims while a filter change is in flight rather than flashing a
          // skeleton back, because `placeholderData` keeps the previous board
          // on screen (PERF-7, AC-F18).
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

      {/* The drill-down. With both filters set a recruiter has asked "who is in
          this cell?", and `GET /api/candidates` now answers (candidate-access
          FR-10.1, and the Revision at the head of its spec, which replaces the
          "Candidate detail is not available yet." placeholder that stood here).

          **One request when a cell is opened, and none while no cell is open**
          (candidate-access PERF-6, AC-F30): with either filter unset this
          renders nothing, so there is no query to disable. */}
      {params.roleId !== undefined && params.stage !== undefined && (
        <PipelineDrillDown roleId={params.roleId} stage={params.stage} />
      )}
    </section>
  );
};
