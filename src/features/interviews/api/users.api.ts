import { apiFetch } from '@/lib/api';
import type { InterviewersResponse } from '../types';

/**
 * `GET /api/users` — the interviewer picker's source.
 *
 * **A separate module from `interviews.api.ts` on purpose**: this is not an
 * interviews endpoint. It is a shipped, recruiter-gated route that returns
 * interviewers only, and this feature simply happens to be its first caller in
 * the whole app. Putting it beside the interviews wrappers would suggest it
 * belongs to them.
 *
 * Because the endpoint returns interviewers and nobody else, the API's
 * `400 NOT_AN_INTERVIEWER` should be unreachable through the picker — which is
 * exactly why the mutation still handles it.
 */
export const listInterviewers = (): Promise<InterviewersResponse> => {
  return apiFetch<InterviewersResponse>('/api/users');
};
