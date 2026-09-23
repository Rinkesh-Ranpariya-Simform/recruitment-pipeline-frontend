'use client';

import Link from 'next/link';
import { ArrowLeftIcon, CalendarDaysIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotFoundView } from '@/components/NotFoundView';
import { ScheduleInterviewDialog } from '@/features/interviews/components/ScheduleInterviewDialog';
import { PIPELINE_STAGE_LABELS, pipelineStatusLabel } from '@/features/pipeline/labels';
import { ApiError } from '@/lib/api';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { parseApplicationId, useRecruiterApplicationQuery } from '../hooks/useApplicationsQuery';
import { InterviewRoundCard } from './InterviewRoundCard';
import { StageTimeline } from './StageTimeline';

/**
 * `/interviews/:applicationId` — **the page a candidate's interview process is
 * run from** (applications FR-4).
 *
 * It sits under `/interviews` rather than `/applications` because that is what
 * it is: the middle of three levels, between the list of candidates in process
 * and one round of one process. `/applications` is the inbox that feeds it, and
 * an application that has not been called yet has nothing on this page to show.
 *
 * Its layout is the answer to "where does this person stand, and what do I do
 * next", top to bottom:
 *
 * 1. **Who, for what, and where** — name, role, stage, status.
 * 2. **Schedule interview**, the one action that belongs to the application
 *    rather than to a round.
 * 3. **The stage transition timeline** — `Applied → Screened (phone screen) →
 *    Interview (technical) → …` — the same nodes a candidate sees on their own
 *    page, built by the same server-side function.
 * 4. **The rounds**, newest last, as cards. Each one opens
 *    `/interviews/:applicationId/:interviewId`, which is where the panel, the
 *    feedback and the Select / Reject pair are.
 *
 * **There is no Select or Reject button on this page, deliberately.** A verdict
 * belongs to a round — it is recorded against the round that produced it — and
 * offering it here would mean asking a recruiter to advance somebody without
 * naming what they passed. The timeline updates from here because the decision
 * made on a round's page moves the application, not the other way round.
 */

/** The loading state, shaped like the detail layout rather than a spinner. */
const DetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-5 w-40 rounded-4xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
};

interface RecruiterApplicationDetailProps {
  applicationId: string;
}

export const RecruiterApplicationDetail: React.FC<RecruiterApplicationDetailProps> = ({
  applicationId,
}) => {
  const parsedId = parseApplicationId(applicationId);
  const applicationQuery = useRecruiterApplicationQuery(parsedId);

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
  const isLive = application.status === 'ACTIVE';

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/interviews"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Interviews
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {application.candidate.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <Link
                href={`/roles/${application.role.id}`}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none"
              >
                {application.role.title}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={application.status === 'REJECTED' ? 'secondary' : 'default'}>
                {pipelineStatusLabel(application.status)}
              </Badge>
              <Badge variant="outline">
                Stage: {PIPELINE_STAGE_LABELS[application.currentStage] ?? application.currentStage}
                {' · '}
                {formatRelative(application.stageEnteredAt)}
              </Badge>
            </div>
          </div>

          {/*
            The schedule dialog's second call site. Only offered while the
            application is live; the API's `409 APPLICATION_NOT_ACTIVE` is the
            check, and the dialog handles it.
          */}
          {isLive && (
            <ScheduleInterviewDialog
              applicationId={application.id}
              currentStage={application.currentStage}
              triggerLabel="Schedule interview"
            />
          )}
        </div>
      </div>

      <section className="space-y-3 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Progress</h2>
          <p className="text-sm text-muted-foreground">
            Every step so far. Green is passed, red is not selected — click a round to open it.
          </p>
        </div>
        <StageTimeline
          nodes={application.timeline}
          roundBasePath={`/interviews/${application.id}`}
        />
      </section>

      <section className="flex flex-col gap-4 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Interviews</h2>
          <p className="text-sm text-muted-foreground">
            Open a round to see its panel and feedback, set its date, or record a decision.
          </p>
        </div>

        {application.interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
            <CalendarDaysIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No rounds yet.</p>
              <p className="text-sm text-muted-foreground">
                {isLive
                  ? 'Schedule one to start this candidate’s process.'
                  : 'This application was closed before any round ran.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {application.interviews.map((interview) => (
              <InterviewRoundCard
                key={interview.id}
                applicationId={application.id}
                interview={interview}
              />
            ))}
          </div>
        )}
      </section>

      <dl className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Applied</dt>
          <dd>{formatAbsolute(application.createdAt)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">At this stage since</dt>
          <dd>
            {formatAbsolute(application.stageEnteredAt)}{' '}
            <span className="text-muted-foreground">
              ({formatRelative(application.stageEnteredAt)})
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
};
