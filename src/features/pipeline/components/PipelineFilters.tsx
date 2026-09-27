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
  /** Roles available for filtering, derived from the current board response. */
  roles: Array<PipelineRole>;
}

/** Pipeline board filter controls for selecting role and stage via URL query parameters. */
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
