'use client';

import Link from 'next/link';

import { RoleStatusBadge } from '@/features/roles/components/RoleStatusBadge';
import type { PipelineRole, PipelineStage } from '../types';
import { PipelineStageCard } from './PipelineStageCard';

interface PipelineRoleSectionProps {
  role: PipelineRole;
  /** The stage this board is drilled into, if any — used to highlight its card. */
  activeStage: PipelineStage | undefined;
  drillDownAvailable: boolean;
}

/**
 * One role's row of the board: its title, its status, its live total, and its
 * stage cards (FR-3.1).
 *
 * **The cards are rendered in the order the API gave them and are never
 * sorted** (FR-3.2, XBE-6). The backend densifies the array — every role
 * carries all four stages in `STAGE_ORDER`, including the zero-count ones — so
 * this component neither invents a missing stage nor decides what order the
 * board reads in. Sorting here would be a second opinion about the pipeline,
 * and `APPLIED, INTERVIEW, OFFER, SCREEN` is a board nobody can read.
 *
 * A `CLOSED` role with live applications still appears, with its badge and its
 * counts (EC-11, backend AZ-6). Hiding it is how people get forgotten in a
 * requisition someone tidied up.
 *
 * **The grid is four columns at `lg`, two at `md`, one below** (FE-10) — so a
 * phone scrolls vertically and never sideways, which is the layout rule this
 * app follows everywhere.
 */
export const PipelineRoleSection: React.FC<PipelineRoleSectionProps> = ({
  role,
  activeStage,
  drillDownAvailable,
}) => {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`pipeline-role-${role.id}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={`pipeline-role-${role.id}`} className="text-base font-semibold">
          {/* To the requisition itself, so a recruiter reading the board can
              get to the description without going through the roles list. */}
          <Link href={`/roles/${role.id}`} className="hover:underline">
            {role.title}
          </Link>
        </h2>
        <RoleStatusBadge status={role.status} />
        <p className="ml-auto text-sm text-muted-foreground tabular-nums">
          {role.totalActive} active
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {role.stages.map((cell) => (
          <PipelineStageCard
            key={cell.stage}
            roleId={role.id}
            cell={cell}
            active={cell.stage === activeStage}
            drillDownAvailable={drillDownAvailable}
          />
        ))}
      </div>
    </section>
  );
};

/** The board's loading shape: three role sections, four card placeholders each. */
export const PipelineBoardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      {[0, 1, 2].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <div className="h-5 w-56 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
