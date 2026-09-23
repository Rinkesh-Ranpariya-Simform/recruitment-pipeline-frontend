'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PIPELINE_SUMMARY_KEY } from '@/features/pipeline/hooks/usePipelineQuery';
import {
  assignInterviewer,
  createInterview,
  unassignInterviewer,
  updateInterviewStatus,
} from '../api/interviews.api';
import type { ScheduleInterviewValues } from '@/lib/schemas/interview';
import type { InterviewStatus } from '../types';
import { INTERVIEWS_DETAIL_KEY, INTERVIEWS_LIST_KEY } from './useInterviewsQuery';

/**
 * The four interview mutations, sharing one cache policy.
 *
 * **No optimistic updates**, matching every shipped mutation in this app. The
 * panel a recruiter sees after assigning somebody is the server's, not a
 * locally merged guess.
 *
 * **Invalidation is `onSettled`, not `onSuccess`**, and that is the whole point
 * of this file. A `409 ALREADY_ASSIGNED` means the view was stale — somebody
 * was assigned in another tab — so the failure is precisely the case where a
 * refetch is most needed. Invalidating only on success would leave the picker
 * still offering the person who just caused the conflict.
 *
 * Toasts are raised by the callers rather than here, because each one needs the
 * name of the person involved and the message differs per outcome.
 */

/**
 * What every write in this feature invalidates.
 *
 * Both prefixes, always: a status change alters a row in the list and the
 * round's own detail, and an assignment alters the panel on both. The dashboard
 * summary too — its Interviews tile counts scheduled rounds, so scheduling or
 * cancelling one changes a number a recruiter may be looking at in another tab.
 *
 * Not `queryClient.clear()` — that would drop the identity cache and cost a
 * `GET /api/auth/me` on every write.
 */
const useInvalidateInterviews = () => {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: INTERVIEWS_LIST_KEY });
    void queryClient.invalidateQueries({ queryKey: INTERVIEWS_DETAIL_KEY });
    void queryClient.invalidateQueries({ queryKey: PIPELINE_SUMMARY_KEY });
  };
};

interface CreateInterviewInput {
  applicationId: number;
  values: ScheduleInterviewValues;
}

/** Schedules a round. The caller navigates or toasts; this only writes. */
export const useCreateInterview = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: ({ applicationId, values }: CreateInterviewInput) =>
      createInterview(applicationId, values),
    onSettled: invalidate,
  });
};

interface UpdateInterviewStatusInput {
  interviewId: number;
  status: Extract<InterviewStatus, 'COMPLETED' | 'CANCELLED'>;
}

/**
 * Completes or cancels a round.
 *
 * **It does not touch the panel**, because the API does not: cancelling keeps
 * the assignments and any feedback already submitted. The round was planned and
 * its panel was chosen, and erasing the panel would erase that record.
 */
export const useUpdateInterviewStatus = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: ({ interviewId, status }: UpdateInterviewStatusInput) =>
      updateInterviewStatus(interviewId, status),
    onSettled: invalidate,
  });
};

interface AssignInterviewerInput {
  interviewId: number;
  interviewerId: number;
}

export const useAssignInterviewer = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: ({ interviewId, interviewerId }: AssignInterviewerInput) =>
      assignInterviewer(interviewId, interviewerId),
    onSettled: invalidate,
  });
};

interface UnassignInterviewerInput {
  interviewId: number;
  userId: number;
}

/**
 * Takes somebody off a round.
 *
 * Typed `Promise<void>`: the endpoint answers `204` with an empty body and
 * there is no seat left to cache.
 */
export const useUnassignInterviewer = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: ({ interviewId, userId }: UnassignInterviewerInput) =>
      unassignInterviewer(interviewId, userId),
    onSettled: invalidate,
  });
};
