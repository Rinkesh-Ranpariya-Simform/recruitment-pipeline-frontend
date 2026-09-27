import type { ApplicationStatus, PipelineStage } from './types';

/** Recruiter-facing labels for pipeline stages and statuses (separate from candidate-facing labels). */

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screen',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

export const PIPELINE_STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'Active',
  HIRED: 'Hired',
  // Recruiter sees "Rejected"; candidates see "Not selected" in their own labels file.
  REJECTED: 'Rejected',
};

/** Returns the human-readable label, or falls back to the raw value for unknown stages. */
export const pipelineStageLabel = (stage: PipelineStage): string => {
  return (PIPELINE_STAGE_LABELS as Record<string, string | undefined>)[stage] ?? stage;
};

export const pipelineStatusLabel = (status: ApplicationStatus): string => {
  return (PIPELINE_STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;
};
