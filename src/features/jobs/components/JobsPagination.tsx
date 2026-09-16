'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildJobsHref } from '../search-params';
import type { JobsPagination as JobsPaginationShape } from '../types';

interface JobsPaginationProps {
  pagination: JobsPaginationShape;
  q: string | undefined;
}

/**
 * Previous / next, plus the current position — the same shape as the roles
 * pager, over `/jobs` hrefs instead of `/roles` ones.
 *
 * `totalPages` comes from the server rather than being recomputed from `total`
 * and `pageSize`; duplicating that arithmetic is how a pager ends up offering a
 * page that doesn't exist.
 */
export const JobsPagination: React.FC<JobsPaginationProps> = ({ pagination, q }) => {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t pt-4"
      aria-label="Open positions pagination"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          render={hasPrevious ? <Link href={buildJobsHref({ q, page: page - 1 })} /> : <span />}
        >
          <ChevronLeftIcon aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          render={hasNext ? <Link href={buildJobsHref({ q, page: page + 1 })} /> : <span />}
        >
          Next
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
};
