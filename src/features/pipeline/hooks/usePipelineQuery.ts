'use client';

import { useQuery } from '@tanstack/react-query';

import { getPipeline, getPipelineSummary } from '../api/pipeline.api';
import type { PipelineSearchParams } from '../search-params';

/**
 * The board's query key, scoped by both filters. Both come from the URL, so
 * changing either is an ordinary key change and Back works with no extra cache
 * handling (FE-3).
 */
export const pipelineKey = ({ roleId, stage }: PipelineSearchParams) => {
  return ['pipeline', 'board', { roleId, stage }] as const;
};

/** The prefix every filtered board shares — what a mutation invalidates (FE-3). */
export const PIPELINE_BOARD_KEY = ['pipeline', 'board'] as const;

/** The summary's key. One shape, no parameters, so no factory (FE-3). */
export const PIPELINE_SUMMARY_KEY = ['pipeline', 'summary'] as const;

/**
 * Reads the board, using the provider's default `staleTime` of 30s.
 *
 * **No `refetchInterval` and no polling** (PERF-5). Refetching happens on
 * mount, on a filter change, when a mutation settles, and on window focus —
 * nothing else. The case that actually matters, two recruiters acting at once,
 * is handled by the conflict toast rather than by a poll that would still lose
 * the race.
 *
 * `placeholderData` keeps the previous board on screen while the next one loads
 * (PERF-7), so filtering dims the board rather than flashing a skeleton back at
 * it. An empty flash between filters reads as "no candidates", which is the one
 * thing this view must not say by accident.
 */
export const usePipelineQuery = (params: PipelineSearchParams) => {
  return useQuery({
    queryKey: pipelineKey(params),
    queryFn: () => getPipeline(params),
    placeholderData: (previous) => previous,
  });
};

/**
 * Reads the six dashboard numbers.
 *
 * A **separate query from the board**, deliberately, and the dashboard renders
 * both (PERF-1). That is what lets one fail without blanking the page: the
 * tiles and the stage strip degrade independently (ERR-4).
 */
export const usePipelineSummaryQuery = () => {
  return useQuery({
    queryKey: PIPELINE_SUMMARY_KEY,
    queryFn: getPipelineSummary,
  });
};
