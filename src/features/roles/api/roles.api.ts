import { apiFetch } from '@/lib/api';
import type { RoleCreateValues } from '@/lib/schemas/role';
import type { RoleResponse, RoleStatus, RolesListResponse } from '../types';

/**
 * Every roles request the client makes, one function per endpoint. Components
 * never assemble a path or a header themselves.
 */

interface ListRolesParams {
  status?: RoleStatus;
  page?: number;
}

/**
 * `pageSize` is never sent — the page size is the server's default of 20 and
 * isn't user-configurable.
 *
 * Both parameters are omitted at their defaults so the request matches the URL
 * the user sees. `parseRolesSearchParams` has already sanitised them, so a 400
 * from here shouldn't be reachable.
 */
export const listRoles = ({ status, page }: ListRolesParams = {}): Promise<RolesListResponse> => {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();

  return apiFetch<RolesListResponse>(`/api/roles${query ? `?${query}` : ''}`);
};

/** A 404 here means the role doesn't exist, not that the route is wrong. */
export const getRole = (roleId: number): Promise<RoleResponse> => {
  return apiFetch<RoleResponse>(`/api/roles/${roleId}`);
};

/**
 * Sends only `title` and `description`. A new role is always `OPEN`, and the
 * server assigns `id`, `createdAt` and `updatedAt`.
 */
export const createRole = (values: RoleCreateValues): Promise<RoleResponse> => {
  return apiFetch<RoleResponse>('/api/roles', {
    method: 'POST',
    body: values,
  });
};

/**
 * A partial update — either the changed text fields, or `status` alone. The
 * caller decides what changed; this sends exactly what it's given.
 */
export interface RolePatch {
  title?: string;
  description?: string;
  status?: RoleStatus;
}

export const updateRole = (roleId: number, patch: RolePatch): Promise<RoleResponse> => {
  return apiFetch<RoleResponse>(`/api/roles/${roleId}`, {
    method: 'PATCH',
    body: patch,
  });
};

/**
 * Deletes a requisition permanently.
 *
 * Returns `void` because the endpoint answers `204 No Content`. `apiFetch`
 * handles that: a 204 has no JSON content-type, so it's read as text and
 * resolves to an empty string this signature discards.
 *
 * Deleting a role that is still `OPEN` comes back `409 ROLE_NOT_CLOSED`. The
 * UI only showing the button on a closed role is a convenience, not the check.
 */
export const deleteRole = (roleId: number): Promise<void> => {
  return apiFetch<void>(`/api/roles/${roleId}`, {
    method: 'DELETE',
  });
};
