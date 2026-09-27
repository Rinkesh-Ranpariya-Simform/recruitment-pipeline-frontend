'use client';

import { useQuery } from '@tanstack/react-query';

import { listAuditEntries } from '../api/audit.api';
import type { AuditSearchParams } from '../search-params';

/** Query key factory for audit log searches scoped by filters and page. */
export const auditListKey = ({
  entityType,
  entityId,
  action,
  actorId,
  page,
}: AuditSearchParams) => {
  return ['audit', 'list', { entityType, entityId, action, actorId, page }] as const;
};

/** Query key prefix for invalidating all audit log queries. */
export const AUDIT_LIST_KEY = ['audit', 'list'] as const;

/** Fetches a paginated page of audit log entries with smooth transitions. */
export const useAuditQuery = (params: AuditSearchParams) => {
  return useQuery({
    queryKey: auditListKey(params),
    queryFn: () => listAuditEntries(params),
    placeholderData: (previous) => previous,
  });
};
