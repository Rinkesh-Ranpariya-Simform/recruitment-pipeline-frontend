'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateCandidateContact } from '../api/candidates.api';
import type { CandidateContactPatch, RecruiterCandidateResponse } from '../types';
import { CANDIDATES_LIST_KEY, candidateDetailKey } from './useCandidatesQuery';

/**
 * The one write this feature has (FR-8, FE-11).
 *
 * **No optimistic update** (DM-4). The endpoint answers `200` with the full
 * recruiter detail, so what lands in the cache is the **server's** copy rather
 * than a locally merged one — which is not the same thing as an optimistic
 * write, it is a write of a confirmed value.
 *
 * **Two requests in total: the `PATCH` and the list invalidation. The detail is
 * not refetched** (PERF-4, EC-10, AC-F26) — `setQueryData` from the response is
 * what makes that possible, and it is the shipped `useWriteSuccess` pattern
 * from `useRoleMutations`.
 *
 * The list is invalidated by prefix rather than patched: the phone column on
 * any page a recruiter has visited is now stale, and dropping a row in by hand
 * would leave `total` describing a different set than the rows beside it.
 */
export const useUpdateCandidateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ candidateId, patch }: { candidateId: number; patch: CandidateContactPatch }) =>
      updateCandidateContact(candidateId, patch),
    onSuccess: (response: RecruiterCandidateResponse) => {
      queryClient.setQueryData(candidateDetailKey(response.candidate.id), response);
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_LIST_KEY });
      toast.success('Contact details updated.');
    },
    // Failures are rendered by the dialog, on the fields that caused them and
    // with everything the recruiter typed still in place (ERR-1). A toast here
    // as well would say the same thing twice, in the place it cannot be acted
    // on. The one exception the dialog raises itself is the `404`, where there
    // is no field to attach anything to.
  });
};
