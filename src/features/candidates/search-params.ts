import type { ReadonlyURLSearchParams } from 'next/navigation';

import { isPipelineStage } from '@/features/pipeline/search-params';
import type { ApplicationStatus, PipelineStage } from './types';

/**
 * URL search parameters management for candidate filtering and pagination.
 * Synchronizes the URL state with the UI filter controls, table, and pagination.
 */

/** Maximum length allowed for search queries. */
const MAX_SEARCH_LENGTH = 120;

const APPLICATION_STATUSES: ReadonlyArray<ApplicationStatus> = ['ACTIVE', 'HIRED', 'REJECTED'];

/**
 * Checks if a string is a valid ApplicationStatus.
 */
export const isApplicationStatus = (value: string | null): value is ApplicationStatus => {
  return value !== null && (APPLICATION_STATUSES as ReadonlyArray<string>).includes(value);
};

/** List of available application statuses. */
export const APPLICATION_STATUS_VALUES = APPLICATION_STATUSES;

/** Candidate query parameters shared across roles. */
export interface CandidatesSearchParams {
  roleId: number | undefined;
  stage: PipelineStage | undefined;
  status: ApplicationStatus | undefined;
  page: number;
}

/**
 * Recruiter candidate query parameters, extending shared parameters with search query string.
 */
export interface RecruiterCandidatesSearchParams extends CandidatesSearchParams {
  q: string | undefined;
}

const parseShared = (searchParams: ReadonlyURLSearchParams): CandidatesSearchParams => {
  const rawRoleId = Number(searchParams.get('roleId'));
  const rawPage = Number(searchParams.get('page'));

  return {
    roleId: Number.isInteger(rawRoleId) && rawRoleId >= 1 ? rawRoleId : undefined,
    stage: isPipelineStage(searchParams.get('stage'))
      ? (searchParams.get('stage') as PipelineStage)
      : undefined,
    status: isApplicationStatus(searchParams.get('status'))
      ? (searchParams.get('status') as ApplicationStatus)
      : undefined,
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Parses and sanitizes URL search parameters for recruiter candidate lists.
 * Caps query length, validates enum values, and defaults invalid pages to 1.
 */
export const parseRecruiterCandidatesSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): RecruiterCandidatesSearchParams => {
  const rawQ = searchParams.get('q')?.trim().slice(0, MAX_SEARCH_LENGTH) ?? '';

  return { ...parseShared(searchParams), q: rawQ === '' ? undefined : rawQ };
};

/**
 * Parses search parameters for interviewer candidate lists.
 * Interviewers have restricted filtering and cannot search by text query.
 */
export const parseInterviewerCandidatesSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): CandidatesSearchParams => {
  return parseShared(searchParams);
};

/**
 * Builds a URL path for the candidates list with active filters and pagination.
 */
export const buildCandidatesHref = ({
  q,
  roleId,
  stage,
  status,
  page,
}: Partial<RecruiterCandidatesSearchParams>): string => {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (roleId && roleId > 0) {
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

  return query ? `/candidates?${query}` : '/candidates';
};

/**
 * Determines whether any filters are currently active on the candidates list.
 */
export const hasActiveCandidateFilters = ({
  q,
  roleId,
  stage,
  status,
}: Partial<RecruiterCandidatesSearchParams>): boolean => {
  return q !== undefined || roleId !== undefined || stage !== undefined || status !== undefined;
};

/**
 * Parses the current page number for the role applicants section from search parameters.
 */
export const parseApplicantsPage = (searchParams: ReadonlyURLSearchParams): number => {
  const raw = Number(searchParams.get('applicantsPage'));

  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
};

/**
 * Builds a URL href for the role page with the specified applicants page number,
 * preserving all existing query parameters.
 */
export const buildApplicantsHref = (
  roleId: number,
  searchParams: ReadonlyURLSearchParams,
  page: number,
): string => {
  const params = new URLSearchParams(searchParams.toString());

  if (page > 1) {
    params.set('applicantsPage', String(page));
  } else {
    params.delete('applicantsPage');
  }

  const query = params.toString();

  return query ? `/roles/${roleId}?${query}` : `/roles/${roleId}`;
};
