'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api';
import { errorBodyOf } from '@/lib/error-details';
import type { OutcomeValues, OverrideValues } from '@/lib/schemas/pipeline';
import { moveStage, overrideStage, setOutcome } from '../api/pipeline.api';
import { pipelineStageLabel } from '../labels';
import type { PipelineStage } from '../types';
import { PIPELINE_BOARD_KEY, PIPELINE_SUMMARY_KEY } from './usePipelineQuery';

/** Pipeline mutations — no optimistic updates, cache invalidated on settle (success or error). */

/** Invalidates both the pipeline board and dashboard summary after any write. */
const useInvalidateBoard = () => {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PIPELINE_BOARD_KEY }),
      queryClient.invalidateQueries({ queryKey: PIPELINE_SUMMARY_KEY }),
    ]);
  };
};

/** Returns a user-facing error message for pipeline writes, or null if the caller handles it. */
export const pipelineWriteErrorMessage = (error: unknown): string | null => {
  if (error instanceof ApiError && error.status === 403) {
    return null;
  }

  const body = errorBodyOf(error);

  switch (body?.code) {
    case 'VALIDATION_ERROR':
      return null;

    // Use the API's descriptive message directly.
    case 'INVALID_STAGE_TRANSITION':
      return body.message;

    case 'STAGE_CONFLICT':
      return 'Someone else moved this candidate. The list has been refreshed.';

    case 'APPLICATION_NOT_ACTIVE':
      return 'This application is already closed.';

    case 'NOT_FOUND':
      return 'That application no longer exists.';

    default:
      return 'Something went wrong. Please try again.';
  }
};

/** Shows an error toast for pipeline write failures. */
const toastWriteError = (error: unknown): void => {
  const message = pipelineWriteErrorMessage(error);

  if (message) {
    toast.error(message);
  }
};

interface MoveStageVariables {
  applicationId: number;
  toStage: PipelineStage;
}

/** Advances an application to the next pipeline stage. */
export const useMoveStage = () => {
  const invalidate = useInvalidateBoard();

  return useMutation({
    mutationFn: ({ applicationId, toStage }: MoveStageVariables) =>
      moveStage(applicationId, toStage),
    onSuccess: (_response, { toStage }) => {
      toast.success(`Moved to ${pipelineStageLabel(toStage)}.`);
    },
    onError: toastWriteError,
    onSettled: invalidate,
  });
};

interface OverrideStageVariables {
  applicationId: number;
  values: OverrideValues;
}

/** Overrides the pipeline stage with a recorded reason. */
export const useOverrideStage = () => {
  const invalidate = useInvalidateBoard();

  return useMutation({
    mutationFn: ({ applicationId, values }: OverrideStageVariables) =>
      overrideStage(applicationId, values),
    onSuccess: () => {
      toast.success('Stage overridden. Reason recorded.');
    },
    onError: toastWriteError,
    onSettled: invalidate,
  });
};

interface SetOutcomeVariables {
  applicationId: number;
  values: OutcomeValues;
}

/** Closes an application as hired or rejected. */
export const useSetOutcome = () => {
  const invalidate = useInvalidateBoard();

  return useMutation({
    mutationFn: ({ applicationId, values }: SetOutcomeVariables) =>
      setOutcome(applicationId, values),
    onSuccess: (_response, { values }) => {
      toast.success(values.status === 'HIRED' ? 'Marked as hired.' : 'Marked as rejected.');
    },
    onError: toastWriteError,
    onSettled: invalidate,
  });
};
