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

/**
 * Sums each stage across every role — **from the board response the dashboard
 * already fetched** (FR-2.4, PERF-1).
 *
 * Not a third request, and emphatically not by fetching candidates: the whole
 * point of the aggregate is that a count never costs a list (FR-8.3).
 *
 * The **stage order comes from the API's own densified arrays** and is never
 * re-sorted here (FR-3.2, XBE-6). Iterating the first role's `stages` and
 * looking the same stage up in the others preserves that order without this
 * file holding an opinion about what it is.
 *
 * `maxDaysInStage` is carried through as the **maximum of the maxima**, which
 * is the honest aggregate: the oldest candidate anywhere at that stage. Summing
 * or averaging it across roles would produce a number that describes nobody.
 */
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

/**
 * Where everyone live is, in one row (FR-2.1).
 *
 * Each stage links to `/pipeline?stage=…` (FR-2.5, AC-F09), so the dashboard is
 * a way into the board rather than a picture of it.
 */
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
            {/* `—` when the stage is empty, never "0 days" — the same rule the
                board's cards follow, for the same reason (XBE-7). */}
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
