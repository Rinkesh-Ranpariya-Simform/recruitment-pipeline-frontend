'use client';

import { useQuery } from '@tanstack/react-query';

import { listInterviewers } from '../api/users.api';

/** One shape, no parameters, so no key factory. */
export const INTERVIEWERS_KEY = ['users', 'interviewers'] as const;

/**
 * The interviewer picker's source.
 *
 * **`enabled` is bound to the dialog's open state**, so a recruiter who never
 * assigns anybody never fetches the list — and the assign dialog's first open
 * is the only thing in the whole app that calls `GET /api/users`.
 *
 * The list changes only when an operator seeds an account, so the provider's
 * default `staleTime` is generous enough and there is nothing to tune here.
 */
export const useInterviewersQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: INTERVIEWERS_KEY,
    queryFn: listInterviewers,
    enabled,
  });
};
