'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildApplicationsHref } from '../search-params';
import type { ApplicationsSearchParams } from '../search-params';
import type { Pagination } from '../types';

interface ApplicationsPaginationProps {
  basePath: string;
  params: ApplicationsSearchParams;
  pagination: Pagination;
  /** Parameters the route pins itself and must not write into its own links. */
  omit?: ReadonlyArray<keyof ApplicationsSearchParams>;
}

/**
 * Previous / next, plus the current position.
 *
 * `totalPages` comes from the server rather than being recomputed from `total`
 * and `pageSize` — duplicating that arithmetic is how a pager ends up offering a
 * page that does not exist. Mirrors `InterviewsPagination` and
 * `RolesPagination`.
 */
export const ApplicationsPagination: React.FC<ApplicationsPaginationProps> = ({
  basePath,
  params,
  pagination,
  omit,
}) => {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t pt-4"
      aria-label="Applications pagination"
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
            render={
              <Link href={buildApplicationsHref(basePath, { ...params, page: page - 1 }, omit)} />
            }
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
            render={
              <Link href={buildApplicationsHref(basePath, { ...params, page: page + 1 }, omit)} />
            }
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
