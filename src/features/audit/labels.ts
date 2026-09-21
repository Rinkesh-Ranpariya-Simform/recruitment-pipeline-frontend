import type { AuditAction, AuditEntityType } from './types';

/**
 * How the feed reads.
 *
 * Every map here is a `Record<>` **lookup table keyed by the union, not a
 * comparison** — so a value added to a backend enum is a compile error rather
 * than a blank cell (FE-5, FR-2.4). Same discipline as `NAV_SECTIONS` and the
 * applications labels.
 *
 * All three are module-level constants, built once rather than per render
 * (PERF-6).
 */

export const ACTION_LABELS: Record<AuditAction, string> = {
  CANDIDATE_STAGE_CHANGED: 'Stage changed',
  STAGE_OVERRIDE_CREATED: 'Stage override',
  APPLICATION_OUTCOME_SET: 'Outcome set',
  INTERVIEW_CREATED: 'Interview scheduled',
  INTERVIEWER_ASSIGNED: 'Interviewer assigned',
  INTERVIEWER_UNASSIGNED: 'Interviewer removed',
  FEEDBACK_SUBMITTED: 'Feedback submitted',
  FEEDBACK_UPDATED: 'Feedback edited',
  CANDIDATE_CONTACT_UPDATED: 'Contact details updated',
};

/** The badge variants used by the table. */
export type AuditBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * An override is `destructive` so that **exceptions read as exceptions**: it is
 * the one action that skipped the process, and the brief exists because someone
 * eventually disputes one. Everything else is neutral — these are records of
 * ordinary work, not errors.
 */
export const ACTION_VARIANTS: Record<AuditAction, AuditBadgeVariant> = {
  CANDIDATE_STAGE_CHANGED: 'secondary',
  STAGE_OVERRIDE_CREATED: 'destructive',
  APPLICATION_OUTCOME_SET: 'default',
  INTERVIEW_CREATED: 'secondary',
  INTERVIEWER_ASSIGNED: 'outline',
  INTERVIEWER_UNASSIGNED: 'outline',
  FEEDBACK_SUBMITTED: 'secondary',
  FEEDBACK_UPDATED: 'outline',
  CANDIDATE_CONTACT_UPDATED: 'outline',
};

export const ENTITY_LABELS: Record<AuditEntityType, string> = {
  APPLICATION: 'Application',
  INTERVIEW: 'Interview',
  FEEDBACK: 'Feedback',
  CANDIDATE: 'Candidate',
};

/** The pipeline stages, as they appear inside an entry's `metadata`. */
export const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screen',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

/** The application statuses, likewise. */
export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

/*
 * The tolerant accessors below.
 *
 * The maps above are total over the unions, so type-safe code cannot miss a
 * key. These exist for the case the types cannot cover: **the backend shipping
 * a tenth action before this client does** (FR-3.3, EC-01). A payload is
 * untrusted input, and rendering `SOMETHING_NEW` is better than rendering a
 * blank cell or throwing. The lookups are indexed through a widened key for
 * exactly that reason.
 */

const lookup = (map: Record<string, string>, value: string): string => {
  return (map as Record<string, string | undefined>)[value] ?? value;
};

export const actionLabel = (action: AuditAction): string => lookup(ACTION_LABELS, action);

export const entityLabel = (entityType: AuditEntityType): string =>
  lookup(ENTITY_LABELS, entityType);

export const stageLabel = (stage: string): string => lookup(STAGE_LABELS, stage);

export const statusLabel = (status: string): string => lookup(STATUS_LABELS, status);

/**
 * An action this client has no label for falls back to a neutral badge rather
 * than to `default`, so an unrecognised row never borrows the visual weight of
 * a known one.
 */
export const actionVariant = (action: AuditAction): AuditBadgeVariant => {
  return (ACTION_VARIANTS as Record<string, AuditBadgeVariant | undefined>)[action] ?? 'outline';
};

/** Whether this client knows the action at all — drives the fallback render. */
export const isKnownAction = (action: AuditAction): boolean => {
  return Object.prototype.hasOwnProperty.call(ACTION_LABELS, action);
};
