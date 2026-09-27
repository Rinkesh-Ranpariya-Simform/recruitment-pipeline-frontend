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

interface EmptyStateProps {
  message: string;
  children?: React.ReactNode;
}

/** The shared frame for every empty and error state below. */
const EmptyState: React.FC<EmptyStateProps> = ({ message, children }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
};

const FILTERED_EMPTY_MESSAGE: Record<RoleStatus, string> = {
  OPEN: 'No open roles.',
  CLOSED: 'No closed roles.',
};

/** Roles list page with status filter, table, and pagination. */
export const RolesListView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Sanitize URL params before making the request.
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
        // Show the appropriate empty state based on context.
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
};
