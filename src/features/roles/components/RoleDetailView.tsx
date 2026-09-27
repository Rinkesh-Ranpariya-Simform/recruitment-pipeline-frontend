'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { RoleApplicants } from '@/features/candidates/components/RoleApplicants';
import { ApiError } from '@/lib/api';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { parseRoleId, useRoleQuery } from '../hooks/useRoleQuery';
import { canManageRoles } from '../permissions';
import { RoleDeleteAction } from './RoleDeleteAction';
import { RoleFormDialog } from './RoleFormDialog';
import { RoleNotFound } from './RoleNotFound';
import { RoleStatusAction } from './RoleStatusAction';
import { RoleStatusBadge } from './RoleStatusBadge';

/** The loading state, shaped like the detail layout rather than a spinner. */
const RoleDetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-5 w-16 rounded-4xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
};

interface RoleDetailViewProps {
  roleId: string;
}

/** Role detail page showing title, status, description and timestamps. */
export const RoleDetailView: React.FC<RoleDetailViewProps> = ({ roleId }) => {
  const { user } = useAuth();
  const router = useRouter();

  // Validate the ID format before making a request.
  const parsedId = parseRoleId(roleId);
  const roleQuery = useRoleQuery(parsedId);

  const canManage = canManageRoles(user);

  if (parsedId === null) {
    return <RoleNotFound />;
  }

  if (roleQuery.isPending) {
    return <RoleDetailSkeleton />;
  }

  if (roleQuery.isError) {
    // 404 = role doesn't exist; other errors = request failed.
    if (roleQuery.error instanceof ApiError && roleQuery.error.status === 404) {
      return <RoleNotFound />;
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this role.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void roleQuery.refetch()}
          disabled={roleQuery.isFetching}
        >
          {roleQuery.isFetching ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  const { role } = roleQuery.data;
  const notFoundAfterWrite = () => void roleQuery.refetch();

  /** Navigate to list after deletion (replace to avoid dead-end in history). */
  const goToListAfterDelete = () => router.replace('/roles');

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/roles"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Roles
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
  
            <h1 className="text-2xl font-semibold tracking-tight break-words">{role.title}</h1>
            <RoleStatusBadge status={role.status} />
          </div>

          {/* Role management actions: Edit, Close/Reopen, Delete. */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <RoleFormDialog mode="edit" role={role} onNotFound={notFoundAfterWrite} />
              <RoleStatusAction role={role} onNotFound={notFoundAfterWrite} />
              <RoleDeleteAction
                role={role}
                onDeleted={goToListAfterDelete}
                onNotFound={notFoundAfterWrite}
              />
            </div>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Description</h2>
        {/* Plain text with preserved line breaks (no HTML rendering). */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{role.description}</p>
      </section>

      {/* Applicants section — wrapped in Suspense for useSearchParams. */}
      <Suspense fallback={null}>
        <RoleApplicants roleId={role.id} />
      </Suspense>

      <dl className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Created</dt>
          {/* Show both absolute and relative timestamps. */}
          <dd>
            {formatAbsolute(role.createdAt)}{' '}
            <span className="text-muted-foreground">({formatRelative(role.createdAt)})</span>
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Last updated</dt>
          <dd>{formatAbsolute(role.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  );
};
