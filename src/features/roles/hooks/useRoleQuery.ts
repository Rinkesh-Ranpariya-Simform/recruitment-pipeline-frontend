'use client';

import { useQuery } from '@tanstack/react-query';

import { getRole } from '../api/roles.api';

/** The query key for a single role. */
export function roleDetailKey(roleId: number) {
  return ['roles', 'detail', roleId] as const;
}

/**
 * Turns a raw path segment into an id, or `null` if it isn't one.
 *
 * `/roles/abc` and `/roles/-1` can be rejected without a request — the caller
 * renders the not-found state instead.
 */
export function parseRoleId(roleId: string): number | null {
  return /^\d+$/.test(roleId) && Number(roleId) > 0 ? Number(roleId) : null;
}

/**
 * Reads one role.
 *
 * The list response is never used to seed this cache: the detail view is often
 * reached by deep link or reload, with no list to have come from.
 */
export function useRoleQuery(roleId: number | null) {
  return useQuery({
    // The `?? 0` is never used as a key — `enabled` is false whenever the id is
    // null.
    queryKey: roleDetailKey(roleId ?? 0),
    queryFn: () => getRole(roleId as number),
    enabled: roleId !== null,
  });
}
