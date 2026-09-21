'use client';

import { useQuery } from '@tanstack/react-query';

import { listAuditEntries } from '../api/audit.api';
import type { AuditSearchParams } from '../search-params';

/**
 * The list query key, scoped by every filter and the page. All of them come
 * from the URL, so changing any is an ordinary key change and Back works with
 * no extra cache handling (FE-3).
 */
export const auditListKey = ({
  entityType,
  entityId,
  action,
  actorId,
  page,
}: AuditSearchParams) => {
  return ['audit', 'list', { entityType, entityId, action, actorId, page }] as const;
};

/** The key prefix every page of the feed shares — what Refresh invalidates. */
export const AUDIT_LIST_KEY = ['audit', 'list'] as const;

/**
 * Reads a page of the trace, using the provider's default `staleTime` of 30s.
 *
 * **No `refetchInterval` and no polling** (PERF-3, D-5). The table is
 * append-only and nobody is watching it in real time; refetching happens on
 * mount, on a filter or page change, and when Refresh is pressed. Nothing else.
 *
 * `placeholderData` keeps the previous page's rows on screen while the next one
 * loads, so paging and filtering dim the table rather than flashing a skeleton
 * back (FE-4, PERF-4). An empty flash between pages reads as "nothing
 * recorded", which is the one thing this view must not say by accident.
 */
export const useAuditQuery = (params: AuditSearchParams) => {
  return useQuery({
    queryKey: auditListKey(params),
    queryFn: () => listAuditEntries(params),
    placeholderData: (previous) => previous,
  });
};
