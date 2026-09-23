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

/**
 * The recruiter's applications table — **one component serving two tabs**
 * (applications FR-1.1, FR-6.1).
 *
 * | Route           | `defaults`                | `table`                  | Reads as                    |
 * | --------------- | ------------------------- | ------------------------ | --------------------------- |
 * | `/applications` | `{}`                      | `ApplicationsInboxTable` | Everyone who applied        |
 * | `/interviews`   | `{ hasInterviews: true }` | `InterviewProcessTable`  | Everyone already in process |
 *
 * They are one component because they are one query with one filter difference:
 * the same endpoint, the same parameter vocabulary, the same pager and the same
 * five empty states. What differs is the **row** — an inbox row offers an action
 * and goes nowhere, a process row is a link and offers none — so the table is a
 * prop rather than a condition in here, and each route's columns live in a file
 * of their own.
 *
 * Everything else each route supplies is its own copy, its own empty state and
 * its own pinned filter — all props, so the difference is visible at the call
 * site rather than buried in a condition here.
 *
 * `omit` stops a route writing its own pinned filter into its links:
 * `/interviews` would otherwise spell `?hasInterviews=true` into every page
 * link, stating a fact the route already carries.
 */

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
  /** The rows. `/applications` and `/interviews` show different columns. */
  table: React.FC<{ applications: Array<RecruiterApplication> }>;
  /** Keeps the loading state the same width as `table`. */
  skeletonColumns: number;
  /** Filters this route pins. Overridable from the URL, so a deep link stays honest. */
  defaults?: Partial<ApplicationsSearchParams>;
  /** Shown when nothing matches and no filter is set. */
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
