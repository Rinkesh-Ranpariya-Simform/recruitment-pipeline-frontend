'use client';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { pipelineStageLabel } from '../labels';
import { buildPipelineHref } from '../search-params';
import type { PipelineRole, PipelineStage } from '../types';

interface StageTotal {
  stage: PipelineStage;
  candidateCount: number;
  maxDaysInStage: number | null;
}

/** Calculates aggregate candidate counts and maximum days across all roles per stage. */
const totalByStage = (roles: Array<PipelineRole>): Array<StageTotal> => {
  const first = roles[0];

  if (first === undefined) {
    return [];
  }

  return first.stages.map((cell) => {
    let candidateCount = 0;
    let maxDaysInStage: number | null = null;

    for (const role of roles) {
      const match = role.stages.find((other) => other.stage === cell.stage);

      if (match === undefined) {
        continue;
      }

      candidateCount += match.candidateCount;

      if (match.maxDaysInStage !== null) {
        maxDaysInStage =
          maxDaysInStage === null
            ? match.maxDaysInStage
            : Math.max(maxDaysInStage, match.maxDaysInStage);
      }
    }

    return { stage: cell.stage, candidateCount, maxDaysInStage };
  });
};

interface DashboardStageStripProps {
  roles: Array<PipelineRole>;
}

/** Horizontal pipeline strip displaying applicant totals and oldest tenure per stage. */
export const DashboardStageStrip: React.FC<DashboardStageStripProps> = ({ roles }) => {
  const totals = totalByStage(roles);

  if (totals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No applications yet. Open a role and share it to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {totals.map((total) => (
        <Link
          key={total.stage}
          href={buildPipelineHref({ stage: total.stage })}
          className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Card className="gap-1 p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {pipelineStageLabel(total.stage)}
            </p>
            <p className="text-xl font-semibold tabular-nums">{total.candidateCount}</p>
            {/* Shows a dash when the stage is empty, otherwise shows oldest candidate days. */}
            <p className="text-xs text-muted-foreground">
              {total.candidateCount === 0 || total.maxDaysInStage === null
                ? '—'
                : `oldest ${Number.isInteger(total.maxDaysInStage) ? total.maxDaysInStage : total.maxDaysInStage.toFixed(1)}d`}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
};

/** The strip's loading shape. */
export const DashboardStageStripSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((cell) => (
        <div key={cell} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
};
