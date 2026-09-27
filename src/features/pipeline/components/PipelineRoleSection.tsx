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

/** Displays a single role row with title, status badge, active count, and stage cards. */
export const PipelineRoleSection: React.FC<PipelineRoleSectionProps> = ({
  role,
  activeStage,
  drillDownAvailable,
}) => {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`pipeline-role-${role.id}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={`pipeline-role-${role.id}`} className="text-base font-semibold">
          {/* Link directly to the role detail page. */}
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
