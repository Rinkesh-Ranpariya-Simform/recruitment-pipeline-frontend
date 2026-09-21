'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { usePipelineQuery, usePipelineSummaryQuery } from '../hooks/usePipelineQuery';
import { DashboardStageStrip, DashboardStageStripSkeleton } from './DashboardStageStrip';
import { DashboardTiles, DashboardTilesSkeleton } from './DashboardTiles';

interface PanelErrorProps {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}

/**
 * One panel's failure, inline and retryable.
 *
 * Deliberately **not** a page-level error: the tiles and the strip are two
 * queries, and one failing must degrade one panel rather than blanking the
 * screen (ERR-4, AC-F10). A recruiter whose summary request failed can still
 * read where everyone is.
 */
const PanelError: React.FC<PanelErrorProps> = ({ message, onRetry, retrying }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try again'}
      </Button>
    </div>
  );
};

/**
 * The recruiter's landing page (FR-2), and the reason `ROLE_LANDING.RECRUITER`
 * moved here from `/pipeline` (FR-1.3, D-1): logging in should tell you
 * something, and `/pipeline` is a destination rather than a doorway.
 *
 * **Exactly two requests on mount** (PERF-1): the summary for the tiles, and
 * the board for the stage strip. The strip is computed from the second — never
 * from a third call and never by fetching candidates, which is what the whole
 * aggregate exists to avoid (FR-2.4, FR-8.3).
 *
 * Two queries rather than one on purpose. It is what lets a failure degrade
 * half the page instead of all of it, and it is why both are invalidated
 * together after every write (FE-4) — a move changes a stage count here and an
 * outcome count in the tiles, and refreshing one without the other leaves the
 * two halves of one screen disagreeing.
 */
export const DashboardView: React.FC = () => {
  const summaryQuery = usePipelineSummaryQuery();
  const boardQuery = usePipelineQuery({ roleId: undefined, stage: undefined });

  const summary = summaryQuery.data?.summary;
  const roles = boardQuery.data?.roles ?? [];

  // A fresh database renders zeros and an explanatory line, not a broken
  // layout (FR-2.6). The tiles still render — "0 open roles" is a fact, and
  // hiding it would make an empty system look like a failed request.
  const empty = summary !== undefined && summary.openRoles === 0 && summary.totalApplicants === 0;

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Where hiring stands right now.</p>
      </header>

      <div className="flex flex-col gap-3">
        {summaryQuery.isPending ? (
          <DashboardTilesSkeleton />
        ) : summaryQuery.isError || summary === undefined ? (
          <PanelError
            message="Could not load the headline numbers."
            onRetry={() => void summaryQuery.refetch()}
            retrying={summaryQuery.isFetching}
          />
        ) : (
          <DashboardTiles summary={summary} />
        )}

        {empty && (
          <p className="text-sm text-muted-foreground">
            No applications yet.{' '}
            <Link href="/roles" className="underline underline-offset-4">
              Open a role
            </Link>{' '}
            and share it to get started.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">By stage</h2>

        {boardQuery.isPending ? (
          <DashboardStageStripSkeleton />
        ) : boardQuery.isError ? (
          <PanelError
            message="Could not load stage totals."
            onRetry={() => void boardQuery.refetch()}
            retrying={boardQuery.isFetching}
          />
        ) : (
          <DashboardStageStrip roles={roles} />
        )}
      </div>
    </section>
  );
};
