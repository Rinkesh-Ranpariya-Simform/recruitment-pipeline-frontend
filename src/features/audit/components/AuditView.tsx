'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { errorBodyOf } from '@/lib/error-details';
import { AUDIT_LIST_KEY, useAuditQuery } from '../hooks/useAuditQuery';
import { buildAuditHref, hasActiveAuditFilters, parseAuditSearchParams } from '../search-params';
import { AuditFilters } from './AuditFilters';
import { AuditPagination } from './AuditPagination';
import { AuditTable, AuditTableSkeleton } from './AuditTable';

interface EmptyStateProps {
  message: string;
  hint?: string;
  children?: React.ReactNode;
}

/** The shared frame for every empty and error state below. */
const EmptyState: React.FC<EmptyStateProps> = ({ message, hint, children }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{message}</p>
        {hint && <p className="max-w-md text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
};

/**
 * The `/audit` screen: filters, table, pager, and every state they can be in.
 *
 * **The only component in this feature that reads `useSearchParams()`** (FE-1)
 * — which is why the route above it supplies the Suspense boundary, without
 * which `next build` fails.
 *
 * Only recruiters get here: `(app)/audit/layout.tsx` shows everyone else the
 * app's 404 before this mounts. **That guard is not what protects the data** —
 * `GET /api/audit` answers a non-recruiter `403` whether or not this component
 * ever runs (AZ-1, SEC-1).
 *
 * There is no mutation anywhere in this feature and nothing on this screen
 * writes, so there are no toasts: a query failure renders inline, with the
 * filter bar intact (ERR-1, ERR-2, FE-6).
 */
export const AuditView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Sanitised before anything is requested, so `?action=BANANA&page=-2`
  // renders the unfiltered first page instead of an error, and `?entityId=12`
  // with no type never becomes the 400 the API would answer (FR-4.6, VAL-1).
  const params = parseAuditSearchParams(searchParams);

  const auditQuery = useAuditQuery(params);

  const entries = auditQuery.data?.entries ?? [];
  const pagination = auditQuery.data?.pagination;
  const filtered = hasActiveAuditFilters(params);

  // Should be unreachable given the sanitising above, which is why it gets its
  // own copy rather than the generic failure's: if a recruiter ever sees it,
  // the parse and the API have disagreed about what is valid.
  const isValidationError = errorBodyOf(auditQuery.error)?.code === 'VALIDATION_ERROR';

  const clearFilters = () => router.push(buildAuditHref({}));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        {/* Manual only. There is no polling and no interval — nothing on this
            screen changes while a recruiter reads it, and polling an
            append-only table nobody is watching is wasted requests (D-5,
            PERF-3). */}
        <Button
          variant="outline"
          size="sm"
          disabled={auditQuery.isFetching}
          onClick={() => void queryClient.invalidateQueries({ queryKey: AUDIT_LIST_KEY })}
        >
          <RefreshCwIcon
            className={auditQuery.isFetching ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          {auditQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      {/* Always rendered, in every state below — including the error ones. A
          recruiter whose request failed should not also lose what they typed
          (ERR-2), and the filters stay usable while the first page loads. */}
      <AuditFilters params={params} />

      {auditQuery.isPending ? (
        <AuditTableSkeleton />
      ) : auditQuery.isError ? (
        isValidationError ? (
          <EmptyState message="That filter combination isn't valid.">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState message="Could not load the audit trail.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void auditQuery.refetch()}
              disabled={auditQuery.isFetching}
            >
              {auditQuery.isFetching ? 'Retrying…' : 'Try again'}
            </Button>
          </EmptyState>
        )
      ) : entries.length === 0 ? (
        // Three empty states, and they are not interchangeable. Telling a
        // recruiter "no activity matches these filters" when they have set
        // none — or "nothing recorded yet" when they are simply past the last
        // page — is how an empty feed becomes indistinguishable from a broken
        // one (EC-07, EC-10).
        params.page > 1 ? (
          <EmptyState message="Nothing on this page.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildAuditHref({ ...params, page: 1 }))}
            >
              Back to first page
            </Button>
          </EmptyState>
        ) : filtered ? (
          <EmptyState message="No activity matches these filters.">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            message="No recorded activity yet."
            hint="Stage changes, overrides, assignments and feedback appear here as they happen."
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {/* Scrolls sideways below `md` rather than collapsing to cards: five
              columns of short values read fine in a scroll container, and a
              card layout would separate the action from its details (FE-9). */}
          <div className="overflow-x-auto">
            <AuditTable entries={entries} />
          </div>
          {pagination && <AuditPagination pagination={pagination} params={params} />}
        </div>
      )}
    </section>
  );
};
