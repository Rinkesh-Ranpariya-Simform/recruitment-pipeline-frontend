'use client';

import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildRolesHref } from '../search-params';
import type { Pagination, RoleStatus } from '../types';

/**
 * Previous / next, plus the current position.
 *
 * `totalPages` comes from the server rather than being recomputed from `total`
 * and `pageSize` — duplicating that arithmetic is how a pager ends up offering
 * a page that doesn't exist.
 */
export function RolesPagination({
  pagination,
  status,
}: {
  pagination: Pagination;
  status: RoleStatus | undefined;
}) {
  const { page, totalPages } = pagination;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t pt-4"
      aria-label="Roles pagination"
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
            render={<Link href={buildRolesHref({ status, page: page - 1 })} />}
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
            render={<Link href={buildRolesHref({ status, page: page + 1 })} />}
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
}
