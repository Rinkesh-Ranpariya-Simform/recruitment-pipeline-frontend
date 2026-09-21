import type { ApplicationStatus, PipelineStage } from './types';

/**
 * **Recruiter-facing** stage and status copy (FR-7).
 *
 * Deliberately a second map rather than a reuse of
 * `features/applications/labels.ts` (D-6, FR-7.2). That one is **candidate**
 * copy: it renders `REJECTED` as **"Not selected"**, which is the kind word to
 * show someone about their own application and the wrong word on a recruiter's
 * board, where the process step is called **"Rejected"**. Two audiences, two
 * vocabularies; sharing one map would mean one of them reading the other's.
 *
 * Both are `Record<Union, string>` — **lookup tables, not comparisons** — so a
 * value added to either backend enum is a compile error here rather than a
 * blank cell (FR-7.3). Same discipline as `NAV_SECTIONS` and the candidate maps.
 *
 * Module-level constants, built once rather than per render (PERF-8).
 */

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screen',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

export const PIPELINE_STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'Active',
  HIRED: 'Hired',
  // The whole reason this file exists separately (FR-7.2).
  REJECTED: 'Rejected',
};

/**
 * The label, or the raw value if the backend ever sends something this client
 * does not know.
 *
 * Type-safe code should make that unreachable — but a payload is untrusted
 * input, and rendering `SOMETHING_NEW` is better than rendering a blank cell or
 * throwing. Indexed through a widened key for exactly that case, matching the
 * accessors in `features/applications/labels.ts`.
 */
export const pipelineStageLabel = (stage: PipelineStage): string => {
  return (PIPELINE_STAGE_LABELS as Record<string, string | undefined>)[stage] ?? stage;
};

export const pipelineStatusLabel = (status: ApplicationStatus): string => {
  return (PIPELINE_STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;
};
