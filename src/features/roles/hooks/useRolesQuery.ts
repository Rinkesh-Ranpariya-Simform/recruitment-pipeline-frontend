'use client';

import { useQuery } from '@tanstack/react-query';

import { listRoles } from '../api/roles.api';
import type { RolesSearchParams } from '../search-params';

/**
 * The list query key, scoped by filter and page. Both come from the URL, so
 * changing either is an ordinary key change and Back works without any extra
 * cache handling.
 */
export const rolesListKey = ({ status, page }: RolesSearchParams) => {
  return ['roles', 'list', { status, page }] as const;
};

/** The key prefix every list page shares, for invalidation after a write. */
export const ROLES_LIST_KEY = ['roles', 'list'] as const;

/**
 * Reads a page of roles, using the provider's default `staleTime` of 30s.
 *
 * Not cached indefinitely the way identity is: roles are edited from other
 * people's sessions, and a recruiter reading the list is the one most likely to
 * care that it's current.
 */
export const useRolesQuery = (params: RolesSearchParams) => {
  return useQuery({
    queryKey: rolesListKey(params),
    queryFn: () => listRoles(params),
  });
};
