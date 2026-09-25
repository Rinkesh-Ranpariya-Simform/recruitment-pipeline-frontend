'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildCandidatesHref, type RecruiterCandidatesSearchParams } from '../search-params';
import type { Pagination } from '../types';

interface CandidatesPaginationProps {
  pagination: Pagination;
  /** Carried into every href, so paging preserves the filters (FR-2.3). */
  params: Partial<RecruiterCandidatesSearchParams>;
}

/**
 * Previous / next, plus the current position (XBE-13, FE's reuse of the shipped
 * pager shape).
 *
 * `totalPages` comes from the server rather than being recomputed from `total`
 * and `pageSize` — duplicating that arithmetic is how a pager ends up offering
 * a page that does not exist. Byte-identical in behaviour to
 * `RolesPagination`; a separate component only because the hrefs it builds
 * point at `/candidates` and carry four filters rather than one.
 */
export const CandidatesPagination: React.FC<CandidatesPaginationProps> = ({
  pagination,
  params,
}) => {
  const { page, totalPages } = pagination;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t pt-4"
      aria-label="Candidates pagination"
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
            render={<Link href={buildCandidatesHref({ ...params, page: page - 1 })} />}
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
            render={<Link href={buildCandidatesHref({ ...params, page: page + 1 })} />}
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
