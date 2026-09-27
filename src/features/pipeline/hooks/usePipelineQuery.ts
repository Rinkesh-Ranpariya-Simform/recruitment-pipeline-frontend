'use client';

import { useQuery } from '@tanstack/react-query';

import { getPipeline, getPipelineSummary } from '../api/pipeline.api';
import type { PipelineSearchParams } from '../search-params';

/** Query key factory for the pipeline board, scoped by active filters. */
export const pipelineKey = ({ roleId, stage }: PipelineSearchParams) => {
  return ['pipeline', 'board', { roleId, stage }] as const;
};

/** Query key prefix for invalidating all pipeline board queries. */
export const PIPELINE_BOARD_KEY = ['pipeline', 'board'] as const;

/** Query key for dashboard summary metrics. */
export const PIPELINE_SUMMARY_KEY = ['pipeline', 'summary'] as const;

/** Fetches the pipeline board data with filter support and smooth background updates. */
export const usePipelineQuery = (params: PipelineSearchParams) => {
  return useQuery({
    queryKey: pipelineKey(params),
    queryFn: () => getPipeline(params),
    placeholderData: (previous) => previous,
  });
};

/** Fetches headline summary counts for the dashboard. */
export const usePipelineSummaryQuery = () => {
  return useQuery({
    queryKey: PIPELINE_SUMMARY_KEY,
    queryFn: getPipelineSummary,
  });
};
