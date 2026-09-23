import type { InterviewStatus, InterviewType } from './types';

/**
 * Round-type and round-status copy.
 *
 * Both are `Record<Union, string>` — **lookup tables, not comparisons** — so a
 * value added to either backend enum is a compile error here rather than a
 * blank cell. The same discipline as `NAV_SECTIONS` and the pipeline maps.
 *
 * Module-level constants, built once rather than per render.
 */

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  PHONE_SCREEN: 'Phone screen',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System design',
  CULTURE_FIT: 'Culture fit',
  HIRING_MANAGER: 'Hiring manager',
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * The label, or the raw value if the backend ever sends something this client
 * does not know.
 *
 * Type-safe code should make that unreachable — but a payload is untrusted
 * input, and rendering `COFFEE_CHAT` is better than rendering a blank cell.
 * Indexed through a widened key for exactly that case, matching the accessors
 * in `features/pipeline/labels.ts`.
 */
export const interviewTypeLabel = (type: InterviewType): string => {
  return (INTERVIEW_TYPE_LABELS as Record<string, string | undefined>)[type] ?? type;
};

export const interviewStatusLabel = (status: InterviewStatus): string => {
  return (INTERVIEW_STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;
};
