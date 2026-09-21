import type { UserRole } from '@/features/auth/types';

/**
 * The client's copy of the backend audit contract
 * (backend/specs/features/audit/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to the action set, the entity set, an entry's shape or the pagination
 * envelope has to be made here as well.
 */

/**
 * The nine actions the backend records.
 *
 * All nine exist in the backend enum today although only three are written so
 * far; the rest arrive with the pipeline, interviews, feedback and
 * candidate-access features. They are declared here in full for the same reason
 * they are declared there in full: every map keyed by this union is total, so a
 * value the client does not handle is a compile error rather than a blank cell
 * (FE-5, FR-2.4).
 */
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

/** What `entry.entityId` points at. */
export type AuditEntityType = 'APPLICATION' | 'INTERVIEW' | 'FEEDBACK' | 'CANDIDATE';

/**
 * The actor, always present and always exactly these three keys (XBE-5).
 *
 * **There is deliberately no `email`.** The API's select list does not name it,
 * and this type says so: a payload that ever carried one would fail
 * type-checking here as well as review. Per frontend/CLAUDE.md that is a
 * backend bug to report, not a field to hide in the UI.
 */
export interface AuditActor {
  id: number;
  name: string;
  role: UserRole;
}

/**
 * One entry as the feed returns it.
 *
 * `metadata` is `Record<string, unknown>`, not a discriminated union keyed off
 * `action`. That is deliberate and it is the honest type: the API sends an open
 * object whose shape depends on the action (XBE-4), a payload is untrusted
 * input, and a union here would let the renderer index into fields the wire may
 * not actually carry. The formatter narrows each value at the point of use and
 * falls back rather than trusting a shape (FE-7, FR-3.2).
 *
 * There is no `actorUserId` — the API replaces the raw foreign key with the
 * expanded `actor`, so there is nothing to join on.
 *
 * `createdAt` is an ISO 8601 UTC string; formatting is entirely this client's
 * job (XBE-10).
 */
export interface AuditEntry {
  id: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: AuditActor;
}

/**
 * The list envelope. Byte-identical in shape to the roles one (XBE-2), so the
 * pager renders the server's `totalPages` as given rather than recomputing it.
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** `GET /api/audit` — 200. */
export interface AuditListResponse {
  entries: Array<AuditEntry>;
  pagination: Pagination;
}
