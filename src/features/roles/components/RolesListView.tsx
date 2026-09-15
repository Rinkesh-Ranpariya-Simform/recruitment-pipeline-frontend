'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRolesQuery } from '../hooks/useRolesQuery';
import { canManageRoles } from '../permissions';
import { buildRolesHref, parseRolesSearchParams } from '../search-params';
import { RoleFormDialog } from './RoleFormDialog';
import { RolesPagination } from './RolesPagination';
import { RolesStatusFilter } from './RolesStatusFilter';
import { RolesTable, RolesTableSkeleton } from './RolesTable';
import type { RoleStatus } from '../types';

/** The shared frame for every empty and error state below. */
function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}

const FILTERED_EMPTY_MESSAGE: Record<RoleStatus, string> = {
  OPEN: 'No open roles.',
  CLOSED: 'No closed roles.',
};

/**
 * The `/roles` list: filter, table, pager, and every state they can be in.
 *
 * A client component because the filter and page come from `useSearchParams()`
 * — which is why the route above it supplies the Suspense boundary.
 *
 * Only recruiters get here: `(app)/roles/layout.tsx` shows an interviewer the
 * 404 before this mounts. The `canManage` check on New role is therefore always
 * true today; it stays so the control asks its own question rather than relying
 * on a guard in another file.
 */
export function RolesListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Sanitised before anything is requested, so `?status=BANANA&page=-2` renders
  // the unfiltered first page instead of an error.
  const { status, page } = parseRolesSearchParams(searchParams);

  const rolesQuery = useRolesQuery({ status, page });
  const canManage = canManageRoles(user);

  const roles = rolesQuery.data?.roles ?? [];
  const pagination = rolesQuery.data?.pagination;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'role' : 'roles'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RolesStatusFilter status={status} />
          {canManage && <RoleFormDialog mode="create" />}
        </div>
      </header>

      {rolesQuery.isPending ? (
        <RolesTableSkeleton />
      ) : rolesQuery.isError ? (
        <EmptyState message="Couldn't load roles.">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void rolesQuery.refetch()}
            disabled={rolesQuery.isFetching}
          >
            {rolesQuery.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </EmptyState>
      ) : roles.length === 0 ? (
        // Three different empty states: a page past the end, a filter that
        // matched nothing, and no roles at all. Showing "No roles yet." to
        // someone filtered to Closed would be wrong.
        page > 1 ? (
          <EmptyState message={status ? FILTERED_EMPTY_MESSAGE[status] : 'No roles on this page.'}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildRolesHref({ status, page: 1 }))}
            >
              Back to first page
            </Button>
          </EmptyState>
        ) : status ? (
          <EmptyState message={FILTERED_EMPTY_MESSAGE[status]}>
            <Button variant="outline" size="sm" onClick={() => router.push(buildRolesHref({}))}>
              Show all roles
            </Button>
          </EmptyState>
        ) : (
          <EmptyState message="No roles yet.">
            {canManage && <RoleFormDialog mode="create" />}
          </EmptyState>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <RolesTable roles={roles} />
          {pagination && <RolesPagination pagination={pagination} status={status} />}
        </div>
      )}
    </section>
  );
}
