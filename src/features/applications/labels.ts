import type { ApplicationStatus, PipelineStage } from './types';

/**
 * How a candidate reads their own application.
 *
 * Both are `Record<>` **lookup tables, not comparisons**, keyed by the union —
 * so a value added to either backend enum is a compile error here rather than a
 * blank cell. Same discipline as `NAV_SECTIONS`.
 *
 * The copy is deliberately candidate-facing rather than internal: a rejected
 * applicant reads "Not selected", not the pipeline's `REJECTED`.
 */

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'In progress',
  HIRED: 'Hired',
  REJECTED: 'Not selected',
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

/**
 * The label, or the raw value if the backend ever sends something this client
 * doesn't know.
 *
 * Type-safe code should make that unreachable — but a payload is untrusted
 * input, and rendering `SOMETHING_NEW` is better than rendering a blank cell or
 * throwing. The lookups are indexed through a widened key for exactly that case.
 */
export const statusLabel = (status: ApplicationStatus): string => {
  return (STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;
};

export const stageLabel = (stage: PipelineStage): string => {
  return (STAGE_LABELS as Record<string, string | undefined>)[stage] ?? stage;
};
