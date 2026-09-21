import { apiFetch } from '@/lib/api';
import type { AuditSearchParams } from '../search-params';
import type { AuditListResponse } from '../types';

/**
 * Every audit request the client makes — which is **one** (FE-2, FE-6).
 *
 * This is the only file that names the `/api/audit` path, and no component
 * assembles a path or a query string itself (API-1, API-2).
 *
 * There is deliberately no `updateAuditEntry` and no `deleteAuditEntry`. The
 * API has no such route — both answer 404 (XBE-11) — and an exported wrapper
 * for an endpoint with no UI is how a removed feature comes back by accident.
 */

/**
 * A page of the trace.
 *
 * `pageSize` is **never sent** (API-4, XBE-8): the page size is the server's
 * default of 20 and isn't user-configurable, and asking for 101 would be a 400
 * rather than a clamp.
 *
 * Every parameter is omitted at its default so the request matches the URL the
 * recruiter sees (API-3). `parseAuditSearchParams` has already sanitised them
 * — including dropping an `entityId` with no `entityType` — so the 400s the API
 * can return should be unreachable from here.
 *
 * `actorId` is forwarded if present even though no control produces it
 * (API-6, FR-4.4).
 */
export const listAuditEntries = ({
  entityType,
  entityId,
  action,
  actorId,
  page,
}: Partial<AuditSearchParams> = {}): Promise<AuditListResponse> => {
  const params = new URLSearchParams();

  if (entityType) {
    params.set('entityType', entityType);

    // Nested, not a sibling `if`: the pair is what the API accepts, and
    // sending an id without its type is the one combination that 400s
    // (XBE-7). The parse already guarantees this, and so does this.
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

  return apiFetch<AuditListResponse>(`/api/audit${query ? `?${query}` : ''}`);
};
