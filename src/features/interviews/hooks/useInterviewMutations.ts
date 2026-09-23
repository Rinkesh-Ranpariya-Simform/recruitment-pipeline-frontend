'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  APPLICATIONS_DETAIL_KEY,
  APPLICATIONS_LIST_KEY,
  RECRUITER_APPLICATIONS_LIST_KEY,
} from '@/features/applications/hooks/useApplicationsQuery';
import { PIPELINE_SUMMARY_KEY } from '@/features/pipeline/hooks/usePipelineQuery';
import {
  assignInterviewer,
  createInterview,
  recordInterviewDecision,
  startPhoneScreen,
  unassignInterviewer,
  updateInterview,
} from '../api/interviews.api';
import type { ScheduleInterviewValues } from '@/lib/schemas/interview';
import type { InterviewOutcome, InterviewStatus } from '../types';
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
    // The applications surfaces, added with the stage timeline: every write in
    // this feature changes something one of them renders. Scheduling a round
    // changes an application's round count and puts a new PENDING node on its
    // timeline; a decision recolours a node and may move the whole application
    // to another stage. Leaving these out is how a recruiter clicks Select and
    // watches the timeline behind the dialog not move.
    //
    // The candidate list too — the timeline is theirs as much as the
    // recruiter's, and a candidate with the page open should not be the last to
    // know.
    void queryClient.invalidateQueries({ queryKey: RECRUITER_APPLICATIONS_LIST_KEY });
    void queryClient.invalidateQueries({ queryKey: APPLICATIONS_DETAIL_KEY });
    void queryClient.invalidateQueries({ queryKey: APPLICATIONS_LIST_KEY });
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

/**
 * Starts the first round from the applications table — one click, no date.
 *
 * A separate hook from `useCreateInterview` even though it calls the same
 * endpoint, because the two are different actions with different call sites and
 * different toasts. Sharing one would mean the table reaching for a mutation
 * whose name implies a dialog it does not open.
 */
export const useStartPhoneScreen = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: (applicationId: number) => startPhoneScreen(applicationId),
    onSettled: invalidate,
  });
};

interface UpdateInterviewInput {
  interviewId: number;
  status?: Extract<InterviewStatus, 'COMPLETED' | 'CANCELLED'>;
  /** Present-and-null clears the date; absent leaves it alone. */
  scheduledAt?: string | null;
}

/**
 * Completes or cancels a round, sets or clears its date, or both.
 *
 * **It does not touch the panel**, because the API does not: cancelling keeps
 * the assignments and any feedback already submitted. The round was planned and
 * its panel was chosen, and erasing the panel would erase that record.
 *
 * `'scheduledAt' in input`, not a truthiness test — `null` is a meaningful value
 * and means "clear it", so the key has to be forwarded exactly as the caller
 * passed it.
 */
export const useUpdateInterview = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: ({ interviewId, ...input }: UpdateInterviewInput) =>
      updateInterview(interviewId, {
        ...(input.status === undefined ? {} : { status: input.status }),
        ...('scheduledAt' in input ? { scheduledAt: input.scheduledAt ?? null } : {}),
      }),
    onSettled: invalidate,
  });
};

interface RecordDecisionInput {
  interviewId: number;
  decision: InterviewOutcome;
}

/**
 * Records the verdict at one round, and with it whatever that moves.
 *
 * **No optimistic update**, and here that matters more than anywhere else in
 * this app: whether a Select advances the candidate depends on the stage graph
 * and on where they already are, which is the server's answer and not something
 * a client should guess at and then correct. The timeline a recruiter sees after
 * clicking is the one the database holds.
 *
 * `onSettled` invalidation, as everywhere: a `409` means the view was stale, so
 * the failure is precisely the case where a refetch is most needed.
 */
export const useRecordInterviewDecision = () => {
  const invalidate = useInvalidateInterviews();

  return useMutation({
    mutationFn: ({ interviewId, decision }: RecordDecisionInput) =>
      recordInterviewDecision(interviewId, decision),
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
