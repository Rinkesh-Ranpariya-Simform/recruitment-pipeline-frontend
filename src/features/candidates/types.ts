/**
 * Type definitions for candidates data structures and API responses.
 * Separates data shapes between recruiters (full candidate details, contact info, applications)
 * and interviewers (restricted to candidate name and assigned rounds).
 */

export type { ApplicationStatus, PipelineStage } from '@/features/applications/types';
export type { InterviewStatus, InterviewType } from '@/features/interviews/types';

import type { ApplicationStatus, PipelineStage } from '@/features/applications/types';
import type { Feedback } from '@/features/feedback/types';
import type { InterviewStatus, InterviewType } from '@/features/interviews/types';

/** Standard pagination metadata for candidate lists. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------
 * Interviewer View Types
 * ---------------------------------------------------------------------- */

/**
 * Candidate profile data available to interviewers (name and identifier only).
 */
export interface InterviewerCandidate {
  id: number;
  name: string;
}

/**
 * An interview round assigned to the current interviewer for a candidate.
 */
export interface InterviewerCandidateInterview {
  id: number;
  type: InterviewType;
  stage: PipelineStage;
  scheduledAt: string | null;
  status: InterviewStatus;
  role: { id: number; title: string };
}

/* -------------------------------------------------------------------------
 * Recruiter View Types
 * ---------------------------------------------------------------------- */

/**
 * Candidate table row data for recruiter candidates list.
 */
export interface RecruiterCandidateRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  applicationCount: number;
  applications: Array<{
    id: number;
    status: ApplicationStatus;
    currentStage: PipelineStage;
    stageEnteredAt: string;
    role: { id: number; title: string };
  }>;
}

/**
 * Candidate profile contact information.
 */
export interface CandidateProfile {
  phone: string | null;
  location: string | null;
  headline: string | null;
  updatedAt: string | null;
}

/** An assigned interviewer on an interview round. */
export interface CandidateAssignment {
  id: number;
  interviewer: { id: number; name: string };
}

/** Feedback submission re-exported for candidate round evaluations. */
export type { Feedback as CandidateFeedback } from '@/features/feedback/types';

/** Interview round details in a candidate application for recruiters. */
export interface CandidateRound {
  id: number;
  type: InterviewType;
  stage: PipelineStage;
  scheduledAt: string | null;
  status: InterviewStatus;
  assignments: Array<CandidateAssignment>;
  feedback: Array<Feedback>;
}

/** Details of a stage override performed on an application. */
export interface CandidateStageOverride {
  id: number;
  reason: string;
  createdAt: string;
  performedBy: { id: number; name: string };
}

/** Single history transition entry in the application stage timeline. */
export interface CandidateStageHistoryEntry {
  id: number;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  toStatus: ApplicationStatus;
  createdAt: string;
  changedBy: { id: number; name: string };
  override: CandidateStageOverride | null;
}

/** Complete application details for a recruiter's candidate view. */
export interface RecruiterCandidateApplication {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  stageEnteredAt: string;
  createdAt: string;
  role: { id: number; title: string; status: 'OPEN' | 'CLOSED' };
  stageHistory: Array<CandidateStageHistoryEntry>;
  interviews: Array<CandidateRound>;
}

/** Complete candidate record for recruiters, including profile and applications. */
export interface RecruiterCandidate {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  profile: CandidateProfile;
  applications: Array<RecruiterCandidateApplication>;
}

/* -------------------------------------------------------------------------
 * API Response Envelopes
 * ---------------------------------------------------------------------- */

/** Recruiter candidates list response with pagination. */
export interface RecruiterCandidatesResponse {
  candidates: Array<RecruiterCandidateRow>;
  pagination: Pagination;
}

/** Interviewer candidates list response with pagination. */
export interface InterviewerCandidatesResponse {
  candidates: Array<InterviewerCandidate>;
  pagination: Pagination;
}

/** Recruiter single candidate detail response. */
export interface RecruiterCandidateResponse {
  candidate: RecruiterCandidate;
}

/** Interviewer single candidate detail response with assigned interview rounds. */
export interface InterviewerCandidateResponse {
  candidate: InterviewerCandidate;
  interviews: Array<InterviewerCandidateInterview>;
}

/** Payload for updating candidate contact information (phone, location, headline). */
export interface CandidateContactPatch {
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
}
