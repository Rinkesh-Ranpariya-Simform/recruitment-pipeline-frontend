'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useRecruiterApplicationsQuery } from '../hooks/useApplicationsQuery';
import type { RecruiterApplication } from '../types';
import {
  buildApplicationsHref,
  parseApplicationsSearchParams,
  type ApplicationsSearchParams,
} from '../search-params';
import { ApplicationsPagination } from './ApplicationsPagination';
import { ApplicationsRoleFilter } from './ApplicationsRoleFilter';
import { ApplicationsStatusFilter } from './ApplicationsStatusFilter';
import { ApplicationsTableSkeleton } from './ApplicationsTableSkeleton';

/** Shared view component for recruiter applications and interviews lists with filtering and pagination. */

interface EmptyStateProps {
  message: string;
  hint?: string;
  children?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, hint, children }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium">{message}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
};

interface RecruiterApplicationsViewProps {
  basePath: string;
  title: string;
  description: string;
  /** Component rendering table rows. */
  table: React.FC<{ applications: Array<RecruiterApplication> }>;
  /** Skeleton loader matching table dimensions. */
  skeletonColumns: number;
  /** Default query filters pinned by the route. */
  defaults?: Partial<ApplicationsSearchParams>;
  /** Fallback empty state message when no applications exist. */
  emptyMessage: string;
  emptyHint?: string;
}

export const RecruiterApplicationsView: React.FC<RecruiterApplicationsViewProps> = ({
  basePath,
  title,
  description,
  table: ApplicationsTable,
  skeletonColumns,
  defaults = {},
  emptyMessage,
  emptyHint,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = parseApplicationsSearchParams(searchParams, defaults);

  // Whatever this route pins is not written back into its own links.
  const omit = Object.keys(defaults) as Array<keyof ApplicationsSearchParams>;

  const { data, isPending, isError, refetch, isFetching } = useRecruiterApplicationsQuery(params);

  const applications = data?.applications ?? [];
  const pagination = data?.pagination;
  // `roleId` counts, and not only because it has a control: it can also arrive
  // by deep link from a requisition, and without it here the Clear filters
  // affordance would be missing on exactly the empty list a recruiter is most
  // likely to be stranded in.
  const isFiltered = params.status !== undefined || params.roleId !== undefined;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role first: "who applied to this req?" is the question a recruiter
              asks before narrowing by status. */}
          <ApplicationsRoleFilter basePath={basePath} params={params} omit={omit} />
          <ApplicationsStatusFilter basePath={basePath} params={params} omit={omit} />
        </div>
      </div>

      {isPending ? (
        <ApplicationsTableSkeleton columns={skeletonColumns} />
      ) : isError ? (
        <EmptyState message="Could not load applications.">
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </EmptyState>
      ) : applications.length === 0 ? (
        params.page > 1 ? (
          <EmptyState message="No applications on this page.">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(buildApplicationsHref(basePath, { ...params, page: 1 }, omit))
              }
            >
              Back to first page
            </Button>
          </EmptyState>
        ) : isFiltered ? (
          <EmptyState message="No applications match this filter.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildApplicationsHref(basePath, {}, omit))}
            >
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState message={emptyMessage} hint={emptyHint} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <ApplicationsTable applications={applications} />
          {pagination && (
            <ApplicationsPagination
              basePath={basePath}
              params={params}
              pagination={pagination}
              omit={omit}
            />
          )}
        </div>
      )}
    </section>
  );
};
