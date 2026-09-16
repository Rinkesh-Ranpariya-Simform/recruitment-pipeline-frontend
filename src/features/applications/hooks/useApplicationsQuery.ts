'use client';

import { useQuery } from '@tanstack/react-query';

import { listApplications } from '../api/applications.api';

/**
 * The one applications key, shared by `/applications` and by the job detail
 * page's "you already applied" line.
 *
 * Sharing it is deliberate: arriving at a job page from My applications then
 * costs **zero** extra requests, and one invalidation after an apply updates
 * both places. Giving the job page its own key would double the requests and let
 * the two views disagree about the same list.
 */
export const APPLICATIONS_LIST_KEY = ['applications', 'list'] as const;

export const useApplicationsQuery = () => {
  return useQuery({
    queryKey: APPLICATIONS_LIST_KEY,
    queryFn: listApplications,
  });
};
