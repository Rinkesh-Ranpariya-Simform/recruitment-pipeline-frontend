'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildAuditHref } from '../search-params';
import type { AuditSearchParams } from '../search-params';
import type { Pagination } from '../types';

interface AuditPaginationProps {
  pagination: Pagination;
  params: AuditSearchParams;
}

/**
 * Previous / next, plus the current position (FR-2.8).
 *
 * A third pager rather than a reuse of `RolesPagination`: the props shape is
 * identical, as the contract promises (XBE-2), but each pager builds its own
 * feature's href and `buildRolesHref` produces `/roles?…`. The shipped pagers
 * are one-per-feature for exactly this reason.
 *
 * Every filter is threaded through the href, so paging keeps the trace a
 * recruiter is reading rather than dropping them back into the full feed.
 *
 * `totalPages` comes from the server rather than being recomputed from `total`
 * and `pageSize` — duplicating that arithmetic is how a pager ends up offering
 * a page that doesn't exist.
 */
export const AuditPagination: React.FC<AuditPaginationProps> = ({ pagination, params }) => {
  const { page, totalPages } = pagination;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t pt-4"
      aria-label="Audit pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        {/* Rendered as disabled buttons rather than links at either end — a
            disabled-looking link is still followable by keyboard. */}
        {hasPrevious ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildAuditHref({ ...params, page: page - 1 })} />}
          >
            <ChevronLeftIcon aria-hidden="true" />
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon aria-hidden="true" />
            Previous
          </Button>
        )}

        {hasNext ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildAuditHref({ ...params, page: page + 1 })} />}
          >
            Next
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
};
