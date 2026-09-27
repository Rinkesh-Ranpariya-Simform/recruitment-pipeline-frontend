import type { UserRole } from '@/features/auth/types';

/** Audit log feature types and API contracts. */

/** Audit action types recorded by the backend. */
export type AuditAction =
  | 'CANDIDATE_STAGE_CHANGED'
  | 'STAGE_OVERRIDE_CREATED'
  | 'APPLICATION_OUTCOME_SET'
  | 'INTERVIEW_CREATED'
  | 'INTERVIEWER_ASSIGNED'
  | 'INTERVIEWER_UNASSIGNED'
  | 'FEEDBACK_SUBMITTED'
  | 'FEEDBACK_UPDATED'
  | 'CANDIDATE_CONTACT_UPDATED';

/** Entity types tracked by the audit system. */
export type AuditEntityType = 'APPLICATION' | 'INTERVIEW' | 'FEEDBACK' | 'CANDIDATE';

/** User actor who performed the audited action. */
export interface AuditActor {
  id: number;
  name: string;
  role: UserRole;
}

/** Represents a single audit log entry returned from the API. */
export interface AuditEntry {
  id: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: AuditActor;
}

/** Paginated list envelope for audit log responses. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Audit log response payload. */
export interface AuditListResponse {
  entries: Array<AuditEntry>;
  pagination: Pagination;
}
