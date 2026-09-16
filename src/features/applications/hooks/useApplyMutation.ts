'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createApplication } from '../api/applications.api';
import { APPLICATIONS_LIST_KEY } from './useApplicationsQuery';

/**
 * Applies to a position and refreshes the applications list.
 *
 * **No optimistic update.** An application is a record the server owns, and
 * showing one before the server confirms it is the single thing a candidate must
 * never be misled about — a rolled-back optimistic row would tell someone they
 * had applied when they hadn't.
 *
 * Only the applications list is invalidated. The job list and the job detail are
 * unaffected by an application, so invalidating them would be two wasted
 * requests.
 *
 * Invalidation runs on **settle**, not on success. A failed apply is usually
 * nothing to refetch for — but a `409 ALREADY_APPLIED` means this client's list
 * is behind the server's, and that is precisely the case where refetching is
 * what corrects the view (the job page then swaps its Apply button for the
 * already-applied panel). One extra request on an error path is a cheap price
 * for never leaving the UI contradicting the server.
 */
export function useApplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) => createApplication(roleId),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: APPLICATIONS_LIST_KEY });
    },
  });
}
