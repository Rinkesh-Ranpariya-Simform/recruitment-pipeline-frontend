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

/** The order the action select offers, which is the order the backend declares. */
export const AUDIT_ACTIONS = ACTIONS;

/** The order the entity select offers. */
export const AUDIT_ENTITY_TYPES = ENTITY_TYPES;

/** A positive integer, or `undefined`. Shared by `entityId` and `actorId`. */
const positiveInt = (raw: string | null): number | undefined => {
  if (raw === null || raw.trim() === '') {
    return undefined;
  }

  const value = Number(raw);

  return Number.isInteger(value) && value >= 1 ? value : undefined;
};

/**
 * Sanitises the query string before anything is requested (FR-4.6, VAL-1).
 *
 * An unrecognised `entityType` or `action` becomes no filter, a non-positive
 * `entityId`/`actorId` is dropped, and a `page` that isn't an integer of at
 * least 1 becomes 1. The server would answer `?action=BANANA` with a 400, so a
 * hand-edited or stale-bookmarked URL renders a working page instead of an
 * error — **the client does not forward garbage to earn a 400 it can predict.**
 *
 * `entityId` is **also dropped when `entityType` is absent** (VAL-3). That pair
 * is a 400 on the API (XBE-7), and this is the second of the three places the
 * rule is enforced: the input is disabled (FR-4.3), the parameter is dropped
 * here, and the backend refuses it authoritatively.
 */
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
    // Honoured from the URL although no control produces it (FR-4.4), so a
    // future "everything this person did" deep link works on arrival.
    actorId: positiveInt(searchParams.get('actorId')),
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
  };
};

/**
 * Builds an `/audit` href. Every parameter is omitted at its default, so the
 * unfiltered first page is a bare `/audit` rather than `/audit?page=1`
 * (FR-4.8) — matching `buildRolesHref`.
 *
 * `entityId` is omitted whenever `entityType` is, so clearing the type clears
 * both **in one navigation** rather than leaving a parameter the next parse
 * would have to drop (FR-4.3, EC-06).
 */
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

/**
 * Whether anything is filtering the feed. Drives the Clear filters button
 * (FR-4.7) and the choice between the two empty states (EC-10) — telling a
 * recruiter "no activity matches these filters" when they have set none is the
 * one thing an empty feed must not say.
 *
 * `page` is not a filter: page 999 of an unfiltered feed is still unfiltered,
 * and it gets its own empty state (EC-07).
 */
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
