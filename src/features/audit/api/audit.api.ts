import { apiFetch } from '@/lib/api';
import type { AuditSearchParams } from '../search-params';
import type { AuditListResponse } from '../types';

/** Audit log API client functions. */

/** Fetches a paginated page of audit log entries matching search and filter criteria. */
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

    // Only include entityId when an entityType is also specified
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
