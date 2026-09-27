'use client';

import { useQuery } from '@tanstack/react-query';

import { getRole } from '../api/roles.api';

/** The query key for a single role. */
export const roleDetailKey = (roleId: number) => {
  return ['roles', 'detail', roleId] as const;
};

/** Parses a URL segment into a numeric role ID, or null if invalid. */
export const parseRoleId = (roleId: string): number | null => {
  return /^\d+$/.test(roleId) && Number(roleId) > 0 ? Number(roleId) : null;
};

/** Fetches a single role by ID. */
export const useRoleQuery = (roleId: number | null) => {
  return useQuery({
    // Fallback key value; query is disabled when id is null.
    queryKey: roleDetailKey(roleId ?? 0),
    queryFn: () => getRole(roleId as number),
    enabled: roleId !== null,
  });
};
