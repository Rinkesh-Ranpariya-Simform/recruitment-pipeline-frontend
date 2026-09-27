import type { ReadonlyURLSearchParams } from 'next/navigation';

import type { AuditAction, AuditEntityType } from './types';

/**
 * The `/audit` URL is the source of truth for every filter and the page.
 * Reading and writing it lives here so the filter bar, the table and the pager
 * can't disagree about the format — the same arrangement as
 * `features/roles/search-params.ts` and `features/jobs/search-params.ts`.
 *
 * A trace nobody can link to is a trace people screenshot (D-3), which is why
 * none of this lives in component state.
 */

export interface AuditSearchParams {
  entityType: AuditEntityType | undefined;
  entityId: number | undefined;
  action: AuditAction | undefined;
  actorId: number | undefined;
  page: number;
}

const ENTITY_TYPES: ReadonlyArray<AuditEntityType> = [
  'APPLICATION',
  'INTERVIEW',
  'FEEDBACK',
  'CANDIDATE',
];

const ACTIONS: ReadonlyArray<AuditAction> = [
  'CANDIDATE_STAGE_CHANGED',
  'STAGE_OVERRIDE_CREATED',
  'APPLICATION_OUTCOME_SET',
  'INTERVIEW_CREATED',
  'INTERVIEWER_ASSIGNED',
  'INTERVIEWER_UNASSIGNED',
  'FEEDBACK_SUBMITTED',
  'FEEDBACK_UPDATED',
  'CANDIDATE_CONTACT_UPDATED',
];

/**
 * Whether a string is an entity type this client recognises.
 *
 * Exported because the filter select needs the same check — base-ui's
 * `onValueChange` hands back a widened `string | null`, and a second copy of
 * the list would eventually disagree with this one.
 */
export const isAuditEntityType = (value: string | null): value is AuditEntityType => {
  return value !== null && (ENTITY_TYPES as ReadonlyArray<string>).includes(value);
};

/** The same, for the action select. */
export const isAuditAction = (value: string | null): value is AuditAction => {
  return value !== null && (ACTIONS as ReadonlyArray<string>).includes(value);
};

/** Action filter dropdown options in declared backend order. */
export const AUDIT_ACTIONS = ACTIONS;

/** Entity filter dropdown options. */
export const AUDIT_ENTITY_TYPES = ENTITY_TYPES;

/** Parses a string into a positive integer ID or undefined if invalid. */
const positiveInt = (raw: string | null): number | undefined => {
  if (raw === null || raw.trim() === '') {
    return undefined;
  }

  const value = Number(raw);

  return Number.isInteger(value) && value >= 1 ? value : undefined;
};

/** Parses and sanitizes URL search parameters into valid audit query options. */
export const parseAuditSearchParams = (
  searchParams: ReadonlyURLSearchParams,
): AuditSearchParams => {
  const entityType = isAuditEntityType(searchParams.get('entityType'))
    ? (searchParams.get('entityType') as AuditEntityType)
    : undefined;

  const rawAction = searchParams.get('action');
  const rawPage = Number(searchParams.get('page'));

  return {
    entityType,
    // Meaningless without a type, so not merely unsent — removed from the
    // parsed state entirely, which is what keeps the URL, the request and the
    // disabled input all telling the same story.
    entityId: entityType === undefined ? undefined : positiveInt(searchParams.get('entityId')),
    action: isAuditAction(rawAction) ? rawAction : undefined,
    // Preserved from URL query parameters if present
    // future "everything this person did" deep link works on arrival.
    actorId: positiveInt(searchParams.get('actorId')),
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/** Constructs an audit log URL query string from filter parameters. */
export const buildAuditHref = ({
  entityType,
  entityId,
  action,
  actorId,
  page,
}: Partial<AuditSearchParams>): string => {
  const params = new URLSearchParams();

  if (entityType) {
    params.set('entityType', entityType);

    if (entityId && entityId > 0) {
      params.set('entityId', String(entityId));
    }
  }

  if (action) {
    params.set('action', action);
  }

  if (actorId && actorId > 0) {
    params.set('actorId', String(actorId));
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return query ? `/audit?${query}` : '/audit';
};

/** Checks whether any active filters are applied to the audit feed. */
export const hasActiveAuditFilters = ({
  entityType,
  entityId,
  action,
  actorId,
}: AuditSearchParams): boolean => {
  return (
    entityType !== undefined ||
    entityId !== undefined ||
    action !== undefined ||
    actorId !== undefined
  );
};
