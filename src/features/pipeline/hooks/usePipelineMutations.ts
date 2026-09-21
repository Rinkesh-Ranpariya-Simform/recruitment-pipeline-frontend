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

/**
 * The three pipeline mutations, sharing one cache policy and one error policy.
 *
 * **No optimistic updates** (FE-6), matching every shipped mutation in this
 * app. A stage move can fail three distinct ways — not allowed, someone else
 * moved first, already closed — and an optimistic board would render all three
 * as a flicker, which is worse than a half-second wait.
 *
 * **Invalidation is `onSettled`, not `onSuccess`** (FE-5), matching
 * `useApplyMutation`. A `409` means this client's view is behind the server's,
 * which is precisely the case where refetching is the remedy: the recruiter
 * gets told *and* shown the truth rather than told and left looking at a lie.
 */

/**
 * What a failed write does to the cache, and what it does not.
 *
 * Both keys, on every write (FE-4): a move changes a stage count on the board
 * **and** an outcome count on the dashboard, and refreshing one without the
 * other leaves two screens disagreeing. The candidates list key joins this list
 * once the candidate-access feature ships.
 */
const useInvalidateBoard = () => {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PIPELINE_BOARD_KEY }),
      queryClient.invalidateQueries({ queryKey: PIPELINE_SUMMARY_KEY }),
    ]);
  };
};

/**
 * The toast copy for a failed write, or `null` when the caller should render
 * the failure itself.
 *
 * **Codes are read from `errorBodyOf(error)?.code`, never from the message
 * string** (ERR-3, API-4) — copy is allowed to change without being a breaking
 * change, and matching on it would make this silently wrong the first time it
 * did.
 *
 * The three `409`s get three distinct messages because they have three distinct
 * remedies — *this move is not allowed*, *refetch and look again*, *this is
 * over* (ERR-2). Collapsing them would make the message wrong two times in
 * three.
 *
 * `null` for a `400`: that one belongs under the field that caused it, and a
 * toast would say it twice in two places. `null` for a `403` too — `apiFetch`
 * has already redirected to `/forbidden` and this view is unmounting, so a
 * toast would flash over the page the recruiter is being sent to.
 */
export const pipelineWriteErrorMessage = (error: unknown): string | null => {
  if (error instanceof ApiError && error.status === 403) {
    return null;
  }

  const body = errorBodyOf(error);

  switch (body?.code) {
    case 'VALIDATION_ERROR':
      return null;

    // The API's message already names both ends of the refused move — "A
    // candidate at Applied cannot move to Offer without an override" — so it is
    // shown rather than replaced by a generic line that says less.
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

/** Raises the toast above, when there is one. Shared by all three mutations. */
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

/**
 * Advances an application one stage (FR-5.2).
 *
 * The success toast names the stage the recruiter landed on, in **recruiter**
 * copy — "Moved to Screen." — rather than echoing the enum value back at them.
 */
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

/**
 * Skips a stage, on the record (FR-6).
 *
 * The success toast says **"Reason recorded."** as well as "Stage overridden.",
 * because the record is the point of the action — the brief's §3.3 is about the
 * row, not the move, and a recruiter should be told the row exists.
 *
 * A `400` raises **no toast** (see `pipelineWriteErrorMessage`): the dialog
 * catches it and renders `details.reason` under the field, keeping the typed
 * text (FR-6.7).
 */
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

/** Closes an application as hired or rejected (FR-5.3). */
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
