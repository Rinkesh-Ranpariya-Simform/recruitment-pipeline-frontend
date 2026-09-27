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

/** Inline error state with retry button (one panel can fail without breaking the whole page). */
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

/** Recruiter dashboard with summary tiles and stage breakdown (two independent queries). */
export const DashboardView: React.FC = () => {
  const summaryQuery = usePipelineSummaryQuery();
  const boardQuery = usePipelineQuery({ roleId: undefined, stage: undefined });

  const summary = summaryQuery.data?.summary;
  const roles = boardQuery.data?.roles ?? [];

  // Detect empty system (no roles/applicants) to show onboarding guidance.
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
