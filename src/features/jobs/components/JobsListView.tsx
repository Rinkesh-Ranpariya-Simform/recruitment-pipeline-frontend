'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BriefcaseIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobsQuery } from '../hooks/useJobsQuery';
import { parseJobsSearchParams } from '../search-params';
import { JobCard } from './JobCard';
import { JobsPagination } from './JobsPagination';
import { JobsSearch } from './JobsSearch';

function JobsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * The candidate's job board.
 *
 * Every row it renders is `OPEN` — not because this filters, but because the
 * backend's query for a non-recruiter can only match open requisitions. **If a
 * closed one ever appears here, that is a backend bug to report**, not a row to
 * filter client-side.
 */
export function JobsListView() {
  const searchParams = useSearchParams();
  const params = parseJobsSearchParams(searchParams);
  const { data, isPending, isError, isPlaceholderData, refetch } = useJobsQuery(params);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Open positions</h1>
        <p className="text-sm text-muted-foreground">Browse roles and apply.</p>
      </div>

      <JobsSearch value={params.q} />

      {isPending ? (
        <JobsSkeleton />
      ) : isError ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Could not load open positions.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </section>
      ) : data.roles.length === 0 ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <BriefcaseIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          {params.q ? (
            <>
              <div className="space-y-1">
                <p className="font-medium">No positions match “{params.q}”.</p>
                <p className="text-sm text-muted-foreground">Try a different title.</p>
              </div>
              <Button variant="outline" size="sm" render={<Link href="/jobs" />}>
                Clear search
              </Button>
            </>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">No open positions right now.</p>
              <p className="text-sm text-muted-foreground">
                Check back later — new roles are posted here.
              </p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Dimmed, not replaced, while the next page or search loads: an empty
              flash between pages reads as "no results". */}
          <div
            className={isPlaceholderData ? 'space-y-3 opacity-60 transition-opacity' : 'space-y-3'}
            aria-busy={isPlaceholderData}
          >
            {data.roles.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          <JobsPagination pagination={data.pagination} q={params.q} />
        </>
      )}
    </div>
  );
}
