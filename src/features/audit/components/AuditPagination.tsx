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

/** Pagination controls for the audit trail table preserving active filter parameters. */
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
