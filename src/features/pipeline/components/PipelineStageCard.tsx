'use client';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { cn } from 'cn';
import { pipelineStageLabel } from '../labels';
import { buildPipelineHref } from '../search-params';
import type { PipelineStageCell } from '../types';
import { StageAgeingBadge } from './StageAgeingBadge';

interface PipelineStageCardProps {
  roleId: number;
  cell: PipelineStageCell;
  /** Whether this is the cell the URL is currently drilled into. */
  active: boolean;
  /**
   * Whether the drill-down list exists yet.
   *
   * `false` until the candidate-access feature ships `GET /api/candidates`
   * (FR-4.2, EC-13). A card that navigates to a list that cannot load is worse
   * than one that does not navigate, so the link is withheld rather than
   * offered and broken.
   */
  drillDownAvailable: boolean;
}

/**
 * One cell of the board: a stage, how many are in it, and how long they have
 * been there (FR-3.4).
 *
 * **There are no candidate names on it**, because the API sends none (XBE-8,
 * D-3). That is not a field being hidden here — the payload has no array of
 * people in it at all, which is what keeps the board's size bounded by roles
 * rather than by the twenty thousand candidates behind them. Names live one
 * click away, on the drill-down.
 *
 * A card with a count is a link into that drill-down; **a zero card is not**
 * (FR-3.7, EC-02). Offering to show a recruiter an empty list is an invitation
 * to a dead end.
 */
export const PipelineStageCard: React.FC<PipelineStageCardProps> = ({
  roleId,
  cell,
  active,
  drillDownAvailable,
}) => {
  const linked = cell.candidateCount > 0 && drillDownAvailable;

  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {pipelineStageLabel(cell.stage)}
      </p>
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          cell.candidateCount === 0 && 'text-muted-foreground',
        )}
      >
        {cell.candidateCount}
      </p>
      <StageAgeingBadge
        candidateCount={cell.candidateCount}
        avgDaysInStage={cell.avgDaysInStage}
        maxDaysInStage={cell.maxDaysInStage}
      />
    </>
  );

  const className = cn(
    'flex flex-col gap-1 p-4 transition-colors',
    active && 'ring-2 ring-primary/40',
    linked && 'hover:border-primary/40 hover:bg-muted/40',
  );

  if (!linked) {
    return <Card className={className}>{body}</Card>;
  }

  // The `<Link>` wraps the card rather than being rendered as it: `Card` is a
  // plain `div` with no `render` prop, unlike `Badge` and `Button`.
  return (
    <Link
      href={buildPipelineHref({ roleId, stage: cell.stage })}
      aria-label={`${cell.candidateCount} at ${pipelineStageLabel(cell.stage)} — show candidates`}
      className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className={className}>{body}</Card>
    </Link>
  );
};
