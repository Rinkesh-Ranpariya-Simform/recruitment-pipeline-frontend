'use client';

import { useRouter } from 'next/navigation';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pipelineStageLabel } from '../labels';
import {
  PIPELINE_STAGES,
  buildPipelineHref,
  hasActivePipelineFilters,
  isPipelineStage,
} from '../search-params';
import type { PipelineSearchParams } from '../search-params';
import type { PipelineRole } from '../types';

/** The selects need a value for "All"; it cannot be absent. */
const ALL = 'ALL';

interface PipelineFiltersProps {
  params: PipelineSearchParams;
  /**
   * The roles the select offers.
   *
   * **Taken from the board response this page already has**, not from a second
   * `GET /api/roles` (PERF-2). The board names every role, so a second request
   * would fetch a list this component is already holding — and one that could
   * disagree with the board beside it.
   *
   * The consequence, stated rather than hidden: while `?roleId=` is set the
   * board returns that one role, so the select offers it and **All roles** and
   * nothing else. Switching directly from one role to another is two clicks —
   * clear, then choose. The alternative was a second request on every mount to
   * populate a dropdown, which PERF-2 rules out and which would give the filter
   * bar its own copy of the role list to disagree with the board about.
   */
  roles: Array<PipelineRole>;
}

/**
 * Role and stage, both written to the URL rather than held in state (FR-3.8).
 *
 * A board nobody can link to is a board people screenshot — the same reasoning
 * as `AuditFilters` and `RolesStatusFilter`, and it is also what makes the
 * dashboard's stage strip work by plain `<Link>` rather than by shared state.
 *
 * `router.push`, not `replace`: Back should return to the previous board.
 */
export const PipelineFilters: React.FC<PipelineFiltersProps> = ({ params, roles }) => {
  const router = useRouter();
  const { roleId, stage } = params;

  const roleOptions = [
    { value: ALL, label: 'All roles' },
    ...roles.map((role) => ({ value: String(role.id), label: role.title })),
  ];

  const stageOptions = [
    { value: ALL, label: 'All stages' },
    ...PIPELINE_STAGES.map((value) => ({ value, label: pipelineStageLabel(value) })),
  ];

  const onRoleChange = (value: string | null) => {
    const next = value === null || value === ALL ? undefined : Number(value);

    router.push(buildPipelineHref({ roleId: Number.isInteger(next) ? next : undefined, stage }));
  };

  const onStageChange = (value: string | null) => {
    router.push(buildPipelineHref({ roleId, stage: isPipelineStage(value) ? value : undefined }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        // Without `items`, base-ui's `SelectValue` renders the raw value, so
        // the trigger would read "ALL" or a bare id instead of a title.
        items={roleOptions}
        value={roleId === undefined ? ALL : String(roleId)}
        onValueChange={onRoleChange}
      >
        <SelectTrigger size="sm" className="w-60" aria-label="Filter the board by role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={stageOptions} value={stage ?? ALL} onValueChange={onStageChange}>
        <SelectTrigger size="sm" className="w-44" aria-label="Filter the board by stage">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Only while something is actually filtering, and it navigates to a bare
          `/pipeline` — not `/pipeline?roleId=`. */}
      {hasActivePipelineFilters(params) && (
        <Button variant="ghost" size="sm" onClick={() => router.push(buildPipelineHref({}))}>
          <XIcon aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
};
