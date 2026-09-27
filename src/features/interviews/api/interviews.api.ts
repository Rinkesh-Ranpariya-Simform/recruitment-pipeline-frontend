import { apiFetch } from '@/lib/api';
import type { ScheduleInterviewValues } from '@/lib/schemas/interview';
import type { InterviewsSearchParams } from '../search-params';
import type {
  AssignmentResponse,
  InterviewOutcome,
  InterviewStatus,
  InterviewerInterviewResponse,
  InterviewerInterviewsResponse,
  RecruiterInterviewResponse,
} from '../types';

/**
 * Every interviews request the client makes, one function per endpoint per
 * projection. Components never assemble a path or a header themselves.
 *
 * **The two reads are two functions each, not one generic one**, because the
 * endpoint returns two different shapes depending on who is asking. A single
 * `listInterviews<T>()` would let a caller name whichever type it felt like and
 * get no complaint from the compiler — which is the one mistake the two-shape
 * design exists to make impossible. The path and query builder is shared, so
 * there is still only one place the URL is constructed.
 */

/**
 * `pageSize` is never sent — the page size is the server's default of 20 and is
 * not user-configurable.
 *
 * Every parameter is omitted at its default, so the request matches the URL the
 * user sees. `parseInterviewsSearchParams` has already sanitised them, so a
 * `400` from here should be unreachable.
 */
const interviewsPath = ({
  status,
  roleId,
  applicationId,
  page,
}: Partial<InterviewsSearchParams> = {}): string => {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (roleId) {
    params.set('roleId', String(roleId));
  }

  if (applicationId) {
    params.set('applicationId', String(applicationId));
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return `/api/interviews${query ? `?${query}` : ''}`;
};

/**
 * The signed-in interviewer's own rounds.
 *
 * **The scoping is the API's, not this call's.** There is no interviewer id in
 * the request: the server reads it from the verified token and puts the
 * assignment predicate into its own query. A round this caller is not on is
 * never in the response, at any page, under any filter — and if one ever
 * appears, **that is a backend bug to report, not a row to filter here.**
 */
export const listInterviewerInterviews = (
  params: Partial<InterviewsSearchParams> = {},
): Promise<InterviewerInterviewsResponse> => {
  return apiFetch<InterviewerInterviewsResponse>(interviewsPath(params));
};

/**
 * **`listRecruiterInterviews` was removed by the applications feature**, with
 * the hook that called it.
 *
 * The endpoint is unchanged and still serves a recruiter's projection; nothing
 * in the UI asks for it, because `/interviews` now lists candidates in a process
 * rather than rounds. `interviewsPath` above stays: the interviewer's list still
 * uses it, and it is the one place a URL for this endpoint is built.
 */

/**
 * One round, as an interviewer.
 *
 * A `404` here means the round is not in this interviewer's scope — **and the
 * client cannot tell whether that is because it does not exist or because they
 * are not on it.** The API answers both identically on purpose, so the caller
 * renders one not-found view and says nothing more.
 */
export const getInterviewerInterview = (
  interviewId: number,
): Promise<InterviewerInterviewResponse> => {
  return apiFetch<InterviewerInterviewResponse>(`/api/interviews/${interviewId}`);
};

/** One round, as a recruiter. A `404` here means there is no such round. */
export const getRecruiterInterview = (interviewId: number): Promise<RecruiterInterviewResponse> => {
  return apiFetch<RecruiterInterviewResponse>(`/api/interviews/${interviewId}`);
};

/**
 * Schedules a round against one application.
 *
 * `scheduledAt` is already an ISO UTC string by the time it gets here — the
 * dialog converts the local-time value the browser's datetime field produces
 * (`toScheduledAtInstant`). A past instant is accepted by the API and is not a
 * client concern, and so is `null`: a round can exist before its date does.
 *
 * `409 APPLICATION_NOT_ACTIVE` when the application is closed. The UI only
 * offering this where the application is live is a convenience, not the check.
 */
export const createInterview = (
  applicationId: number,
  values: ScheduleInterviewValues,
): Promise<RecruiterInterviewResponse> => {
  return apiFetch<RecruiterInterviewResponse>(`/api/applications/${applicationId}/interviews`, {
    method: 'POST',
    body: values,
  });
};

/**
 * Starts the initial phone screen round on an application.
 * Creates an undated phone screen interview round in the screening stage.
 */
export const startPhoneScreen = (applicationId: number): Promise<RecruiterInterviewResponse> => {
  return createInterview(applicationId, {
    type: 'PHONE_SCREEN',
    stage: 'SCREEN',
    scheduledAt: null,
  });
};

/**
 * Changes a round's status, its date, or both.
 *
 * `SCHEDULED` is not an accepted status — the API answers `400`, because
 * un-cancelling is not an action this POC has. An empty body is a `400` too: a
 * PATCH that changes nothing is a client bug, and answering it with the
 * unmodified round would hide the bug behind a success.
 *
 * `scheduledAt: null` clears the date back to undated. The key being **absent**
 * means "leave it alone", which is a different request — so callers must pass
 * the key deliberately rather than letting an `undefined` fall through.
 *
 * A change to an already-terminal round is `409 INVALID_STAGE_TRANSITION`,
 * whichever field it touched. Hiding the controls once a round is terminal is a
 * convenience; that `409` is the check.
 */
export const updateInterview = (
  interviewId: number,
  body: {
    status?: Extract<InterviewStatus, 'COMPLETED' | 'CANCELLED'>;
    scheduledAt?: string | null;
  },
): Promise<RecruiterInterviewResponse> => {
  return apiFetch<RecruiterInterviewResponse>(`/api/interviews/${interviewId}`, {
    method: 'PATCH',
    body,
  });
};

/**
 * Records the decision (SELECT or REJECT) for an interview round.
 * Advances the candidate stage or marks the application as rejected.
 */
export const recordInterviewDecision = (
  interviewId: number,
  decision: InterviewOutcome,
): Promise<RecruiterInterviewResponse> => {
  return apiFetch<RecruiterInterviewResponse>(`/api/interviews/${interviewId}/decision`, {
    method: 'POST',
    body: { decision },
  });
};

/**
 * Puts one interviewer on one round.
 *
 * `409 ALREADY_ASSIGNED` when they are already there — raised by a unique index
 * in the database, so it holds even for two clicks that genuinely overlap.
 * Disabling the option in the picker is a convenience; **the `409` is the
 * check.**
 *
 * `400 NOT_AN_INTERVIEWER` when the chosen user is not one, or does not exist —
 * the same answer either way, so it reveals nothing about which.
 */
export const assignInterviewer = (
  interviewId: number,
  interviewerId: number,
): Promise<AssignmentResponse> => {
  return apiFetch<AssignmentResponse>(`/api/interviews/${interviewId}/assignments`, {
    method: 'POST',
    body: { interviewerId },
  });
};

/**
 * Takes an interviewer off a round.
 *
 * Returns `void` because the endpoint answers `204 No Content`. `apiFetch`
 * handles that: a 204 has no JSON content-type, so it is read as text and
 * resolves to an empty string this signature discards — the same arrangement as
 * the shipped `deleteRole`.
 *
 * **Not idempotent**: removing somebody who is not on the round is a `404`, not
 * a second `204`.
 */
export const unassignInterviewer = (interviewId: number, userId: number): Promise<void> => {
  return apiFetch<void>(`/api/interviews/${interviewId}/assignments/${userId}`, {
    method: 'DELETE',
  });
};
