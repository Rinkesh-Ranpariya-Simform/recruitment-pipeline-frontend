'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateCandidateContact } from '../api/candidates.api';
import type { CandidateContactPatch, RecruiterCandidateResponse } from '../types';
import { CANDIDATES_LIST_KEY, candidateDetailKey } from './useCandidatesQuery';

/**
 * Mutation hook for updating candidate contact details.
 * Directly updates cache with the returned candidate data and invalidates list queries.
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
  });
};
