'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createRole, deleteRole, updateRole, type RolePatch } from '../api/roles.api';
import type { RoleCreateValues } from '@/lib/schemas/role';
import type { RoleResponse } from '../types';
import { roleDetailKey } from './useRoleQuery';
import { ROLES_LIST_KEY } from './useRolesQuery';

/**
 * The three role mutations, sharing one cache policy and one toast policy.
 *
 * No optimistic updates: the create and update endpoints return the complete
 * role, so the server's copy is what renders. That also means a role closed in
 * another tab and edited in this one comes back showing both changes.
 */

/**
 * What every successful write does to the cache.
 *
 * The detail entry is set from the response, so the view shows the server's
 * role rather than a locally merged one. The list is invalidated by prefix, so
 * other pages the user has visited refetch when they're next shown.
 *
 * Not `queryClient.clear()` — that would drop the identity cache too and cost a
 * `GET /api/auth/me` on every write.
 */
function useWriteSuccess() {
  const queryClient = useQueryClient();

  return (response: RoleResponse) => {
    queryClient.setQueryData(roleDetailKey(response.role.id), response);
    void queryClient.invalidateQueries({ queryKey: ROLES_LIST_KEY });
  };
}

/**
 * Success toasts only. Failures are rendered inline on the surface that caused
 * them, where the user can actually act on them.
 */
export function useCreateRole() {
  const onWriteSuccess = useWriteSuccess();

  return useMutation({
    mutationFn: (values: RoleCreateValues) => createRole(values),
    onSuccess: (response) => {
      onWriteSuccess(response);
      toast.success('Role created');
    },
  });
}

/** The success message for a patch, based on what it changed. */
function updateMessage(patch: RolePatch): string {
  if (patch.status === 'CLOSED') {
    return 'Role closed';
  }

  if (patch.status === 'OPEN') {
    return 'Role reopened';
  }

  return 'Role updated';
}

export function useUpdateRole() {
  const onWriteSuccess = useWriteSuccess();

  return useMutation({
    mutationFn: ({ roleId, patch }: { roleId: number; patch: RolePatch }) =>
      updateRole(roleId, patch),
    onSuccess: (response, { patch }) => {
      onWriteSuccess(response);
      toast.success(updateMessage(patch));
    },
  });
}

/**
 * Deletes a role permanently.
 *
 * This is the one write that can't use `useWriteSuccess`: there's no role in
 * the response to cache, and a stale detail entry would let a `/roles/:id`
 * still mounted somewhere render a role the server no longer has. So the entry
 * is removed rather than overwritten — `setQueryData(undefined)` would leave a
 * cached `undefined` that looks like a successful empty read.
 *
 * The list is invalidated rather than patched: dropping the row locally would
 * leave the page one row short and `total` one too high until something
 * refetched.
 *
 * Navigating away is the caller's job — a list and a detail view need to go to
 * different places.
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) => deleteRole(roleId),
    onSuccess: (_result, roleId) => {
      queryClient.removeQueries({ queryKey: roleDetailKey(roleId) });
      void queryClient.invalidateQueries({ queryKey: ROLES_LIST_KEY });
      toast.success('Role deleted');
    },
  });
}
