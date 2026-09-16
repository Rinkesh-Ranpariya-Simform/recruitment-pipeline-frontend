import { apiFetch } from '@/lib/api';
import type { JobResponse, JobsListResponse } from '../types';
import type { JobsSearchParams } from '../search-params';

/**
 * Every job request the client makes. Components never assemble a path.
 *
 * Both hit `/api/roles` — the candidate portal reads the same endpoint the
 * recruiter views do, and the backend decides what comes back from the caller's
 * token. There is no `/api/jobs`.
 *
 * Reads only. Creating, editing and deleting a requisition are recruiter
 * actions and live in `features/roles/api/roles.api.ts`; a wrapper for them
 * here would be an endpoint with no UI, which is how a removed feature comes
 * back by accident.
 */

/**
 * `pageSize` is never sent — the page size is the server's default of 20 and
 * isn't user-configurable. `status` is never sent either: the backend forces
 * `OPEN` for a candidate, so sending it would be decoration.
 *
 * `parseJobsSearchParams` has already sanitised both parameters, so a 400 from
 * here shouldn't be reachable.
 */
export const listJobs = ({
  q,
  page,
}: Partial<JobsSearchParams> = {}): Promise<JobsListResponse> => {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return apiFetch<JobsListResponse>(`/api/roles${query ? `?${query}` : ''}`);
};

/**
 * A 404 here means the position isn't open to this candidate — either it never
 * existed or it has been closed. **The API does not distinguish the two**, and
 * that is deliberate on its side: telling them apart would confirm that a closed
 * requisition exists. So the caller must not claim which one it was.
 */
export const getJob = (jobId: number): Promise<JobResponse> => {
  return apiFetch<JobResponse>(`/api/roles/${jobId}`);
};
