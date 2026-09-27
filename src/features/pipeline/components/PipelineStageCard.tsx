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
  /** Indicates whether the candidates drill-down view is available. */
  drillDownAvailable: boolean;
}

/** Card displaying candidate counts and ageing duration for a role stage, with drill-down link. */
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
