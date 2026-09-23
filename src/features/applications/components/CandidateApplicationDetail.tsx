'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotFoundView } from '@/components/NotFoundView';
import { ApiError } from '@/lib/api';
import { formatAbsolute } from '@/lib/format-date';
import { stageLabel } from '../labels';
import { parseApplicationId, useApplicationQuery } from '../hooks/useApplicationsQuery';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { StageTimeline } from './StageTimeline';

/**
 * `/my-applications/:id` — their own application, with room for the
 * timeline the card can only summarise.
 *
 * **It shows exactly what the card shows**, and that is the point rather than a
 * shortcoming: the payload is the same, because the backend's candidate list and
 * candidate detail use the same projection. There is no extra disclosure behind
 * a detail route — no interviewer, no rating, no note — so there is nothing here
 * that a reviewer has to check separately.
 *
 * An id belonging to someone else is a `404` from a query that never loaded the
 * row, and it renders the app's ordinary not-found page. The client cannot tell
 * that case from a nonexistent id, which is exactly what the API intends.
 */

const DetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
};

interface CandidateApplicationDetailProps {
  applicationId: string;
}

export const CandidateApplicationDetail: React.FC<CandidateApplicationDetailProps> = ({
  applicationId,
}) => {
  const parsedId = parseApplicationId(applicationId);
  const applicationQuery = useApplicationQuery(parsedId);

  if (parsedId === null) {
    return <NotFoundView />;
  }

  if (applicationQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (applicationQuery.isError) {
    if (applicationQuery.error instanceof ApiError && applicationQuery.error.status === 404) {
      return <NotFoundView />;
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Could not load this application.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void applicationQuery.refetch()}
          disabled={applicationQuery.isFetching}
        >
          {applicationQuery.isFetching ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  const { application } = applicationQuery.data;

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/my-applications"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          My applications
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              <Link
                href={`/jobs/${application.role.id}`}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none"
              >
                {application.role.title}
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">
              Applied {formatAbsolute(application.createdAt)} · Stage:{' '}
              {stageLabel(application.currentStage)}
            </p>
          </div>

          <ApplicationStatusBadge status={application.status} />
        </div>
      </div>

      <section className="space-y-3 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Progress</h2>
          <p className="text-sm text-muted-foreground">
            Where your application has been so far. Anything still grey has not been decided yet.
          </p>
        </div>
        <StageTimeline nodes={application.timeline} />
      </section>
    </article>
  );
};
