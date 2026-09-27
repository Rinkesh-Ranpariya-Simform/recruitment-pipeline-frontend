import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { PipelineStage } from './types';

/** URL search param helpers for pipeline board filtering and navigation. */

export interface PipelineSearchParams {
  roleId: number | undefined;
  stage: PipelineStage | undefined;
}

/** The four pipeline stages in display order for filter options. */
const STAGES: ReadonlyArray<PipelineStage> = ['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER'];

/** Type guard checking if a string matches a valid pipeline stage option. */
export const isPipelineStage = (value: string | null): value is PipelineStage => {
  return value !== null && (STAGES as ReadonlyArray<string>).includes(value);
};

/** Ordered stage filter dropdown options. */
export const PIPELINE_STAGES = STAGES;

/** Parses and sanitizes URL search parameters into valid pipeline filter values. */
export const parsePipelineSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): PipelineSearchParams => {
  const rawRoleId = Number(searchParams.get('roleId'));
  const rawStage = searchParams.get('stage');

  return {
    roleId: Number.isInteger(rawRoleId) && rawRoleId >= 1 ? rawRoleId : undefined,
    stage: isPipelineStage(rawStage) ? rawStage : undefined,
  };
};

/** Builds a pipeline URL query string from the given filter parameters. */
export const buildPipelineHref = ({ roleId, stage }: Partial<PipelineSearchParams>): string => {
  const params = new URLSearchParams();

  if (roleId && roleId > 0) {
    params.set('roleId', String(roleId));
  }

  if (stage) {
    params.set('stage', stage);
  }

  const query = params.toString();

  return query ? `/pipeline?${query}` : '/pipeline';
};

/** Checks whether any role or stage filters are currently active. */
export const hasActivePipelineFilters = ({ roleId, stage }: PipelineSearchParams): boolean => {
  return roleId !== undefined || stage !== undefined;
};
