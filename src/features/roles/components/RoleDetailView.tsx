'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
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

/**
 * The role detail page and every state it can be in.
 *
 * A client component because the route above it has to `await params` — in
 * Next 16 `params` is a Promise, so the page can't also run the query.
 *
 * Shows title, status, description and both timestamps, which is every field
 * the API returns. Only recruiters get here — `(app)/roles/layout.tsx` shows an
 * interviewer the 404, which is a rendering decision, not a server refusal.
 */
export const RoleDetailView: React.FC<RoleDetailViewProps> = ({ roleId }) => {
  const { user } = useAuth();
  const router = useRouter();

  // `/roles/abc` never reaches the network — the id is visibly wrong, so the
  // not-found state renders straight away.
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
    // A 404 means the role is gone; any other error means we couldn't ask.
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

  /**
   * After a delete, go back to the list with `replace` rather than `push`: the
   * role is gone, so leaving this URL in the history would make Back land on a
   * not-found page.
   */
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
            {/* Wraps in full here, unlike the truncated table cell. */}
            <h1 className="text-2xl font-semibold tracking-tight break-words">{role.title}</h1>
            <RoleStatusBadge status={role.status} />
          </div>

          {/*
            Edit · Close/Reopen · Delete, ordered by how consequential they are.
            `RoleDeleteAction` renders nothing while the role is open.
          */}
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
        {/*
          `whitespace-pre-wrap` handles line breaks. The description is
          user-supplied content shown to other users, so it stays plain text
          that React escapes — no markdown renderer, no `dangerouslySetInnerHTML`.
        */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{role.description}</p>
      </section>

      <dl className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Created</dt>
          {/* Absolute date with the relative form alongside — how long a
              requisition has been open is the thing people scan for. */}
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
