import type { AuditAction, AuditEntityType } from './types';

/** Formatted display labels and badge variants for audit log entries. */

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

/** Badge color variants mapping for audit actions. */
export type AuditBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/** Visual badge variant assignment per audit action. */
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

/** Formatted labels for pipeline stages in audit metadata. */
export const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREEN: 'Screen',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
};

/** Formatted labels for application statuses in audit metadata. */
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
 * a new action before this client does. A payload is
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

/** Returns badge color variant for an audit action, falling back to neutral. */
export const actionVariant = (action: AuditAction): AuditBadgeVariant => {
  return (ACTION_VARIANTS as Record<string, AuditBadgeVariant | undefined>)[action] ?? 'outline';
};

/** Type guard verifying if an action string is a recognized AuditAction. */
export const isKnownAction = (action: AuditAction): boolean => {
  return Object.prototype.hasOwnProperty.call(ACTION_LABELS, action);
};
