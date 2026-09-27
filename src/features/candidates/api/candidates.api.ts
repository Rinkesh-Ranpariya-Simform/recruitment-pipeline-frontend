import { apiFetch } from '@/lib/api';
import type { CandidatesSearchParams, RecruiterCandidatesSearchParams } from '../search-params';
import type {
  CandidateContactPatch,
  InterviewerCandidateResponse,
  InterviewerCandidatesResponse,
  RecruiterCandidateResponse,
  RecruiterCandidatesResponse,
} from '../types';

/**
 * Candidates API client module providing functions for candidate listing, detail retrieval,
 * and contact information updates.
 */

/**
 * Builds the URL query path for candidate listing endpoints based on active filters and pagination.
 */
const candidatesPath = ({
  q,
  roleId,
  stage,
  status,
  page,
}: Partial<RecruiterCandidatesSearchParams> = {}): string => {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (roleId) {
    params.set('roleId', String(roleId));
  }

  if (stage) {
    params.set('stage', stage);
  }

  if (status) {
    params.set('status', status);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return `/api/candidates${query ? `?${query}` : ''}`;
};

/**
 * Fetches candidates for recruiters, including contact details and applications.
 * Used by the main candidates list, role applicants view, and pipeline drill-down.
 */
export const listRecruiterCandidates = (
  params: Partial<RecruiterCandidatesSearchParams> = {},
): Promise<RecruiterCandidatesResponse> => {
  return apiFetch<RecruiterCandidatesResponse>(candidatesPath(params));
};

/**
 * Fetches candidates assigned to the currently authenticated interviewer.
 * Scope is enforced server-side based on the user's assigned interview rounds.
 */
export const listInterviewerCandidates = (
  params: Partial<CandidatesSearchParams> = {},
): Promise<InterviewerCandidatesResponse> => {
  return apiFetch<InterviewerCandidatesResponse>(candidatesPath(params));
};

/**
 * Fetches complete candidate details for a recruiter by ID.
 */
export const getRecruiterCandidate = (candidateId: number): Promise<RecruiterCandidateResponse> => {
  return apiFetch<RecruiterCandidateResponse>(`/api/candidates/${candidateId}`);
};

/**
 * Fetches candidate details and assigned interview rounds for an interviewer.
 */
export const getInterviewerCandidate = (
  candidateId: number,
): Promise<InterviewerCandidateResponse> => {
  return apiFetch<InterviewerCandidateResponse>(`/api/candidates/${candidateId}`);
};

/**
 * Updates candidate contact details (phone, location, headline).
 * Restricted to recruiters.
 */
export const updateCandidateContact = (
  candidateId: number,
  patch: CandidateContactPatch,
): Promise<RecruiterCandidateResponse> => {
  return apiFetch<RecruiterCandidateResponse>(`/api/candidates/${candidateId}`, {
    method: 'PATCH',
    body: patch,
  });
};
