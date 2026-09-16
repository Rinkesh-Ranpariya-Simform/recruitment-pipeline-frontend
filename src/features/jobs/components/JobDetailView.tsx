'use client';

import { useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { formatAbsolute } from '@/lib/format-date';
import { useJobQuery } from '../hooks/useJobQuery';
import { ApplyAction } from './ApplyAction';
import { JobNotFound } from './JobNotFound';

interface JobDetailViewProps {
  jobId: string;
}

/**
 * One open position, in full.
 *
 * Takes the raw route segment rather than a number: the page passes it straight
 * through, and **this component decides whether it's a valid id**, because it is
 * the one that renders the answer if it isn't. `/jobs/abc` therefore shows the
 * not-found panel without issuing a request.
 */
export const JobDetailView: React.FC<JobDetailViewProps> = ({ jobId }) => {
  // `Number('')` is 0 and `Number('1.5')` is not an integer, so both fail the
  // guard in `useJobQuery` and no request goes out.
  const parsed = Number(jobId);
  const { data, isPending, isError, error } = useJobQuery(parsed);

  // Set when an apply comes back 404 — the requisition was closed while this
  // page was open. Local rather than a refetch: re-requesting would only
  // confirm what the mutation already told us.
  const [gone, setGone] = useState(false);

  const invalidId = !Number.isInteger(parsed) || parsed <= 0;
  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (invalidId || notFound || gone) {
    return <JobNotFound />;
  }

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  if (isError) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="font-medium">Could not load this position.</p>
      </section>
    );
  }

  const job = data.role;

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="text-sm text-muted-foreground">Posted {formatAbsolute(job.createdAt)}</p>
      </header>

      <Separator />

      {/* `whitespace-pre-line` keeps the recruiter's paragraph breaks without
          rendering their text as HTML — React escapes it, and nothing here uses
          dangerouslySetInnerHTML. */}
      <p className="text-sm leading-relaxed whitespace-pre-line">{job.description}</p>

      <Separator />

      <ApplyAction jobId={job.id} onGone={() => setGone(true)} />
    </article>
  );
};
