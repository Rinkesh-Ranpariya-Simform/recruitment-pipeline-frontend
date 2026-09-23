'use client';

import Link from 'next/link';
import { ArrowLeftIcon, TriangleAlertIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { FeedbackSection } from '@/features/feedback/components/FeedbackSection';
import { PIPELINE_STAGE_LABELS } from '@/features/pipeline/labels';
import { interviewTypeLabel } from '../labels';
import { parseInterviewId, useInterviewerInterviewQuery } from '../hooks/useInterviewsQuery';
import { InterviewNotFound } from './InterviewNotFound';
import { InterviewStatusBadge } from './InterviewStatusBadge';

/** The loading state, shaped like the detail layout rather than a spinner. */
const DetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-20 rounded-4xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
};

interface InterviewerInterviewDetailProps {
  interviewId: string;
}

/**
 * One round, as the assigned interviewer sees it.
 *
 * **This component takes an `InterviewerInterview` and could not be handed a
 * recruiter's payload** — a mistaken dispatch in the page above is a compile
 * error rather than a rendering bug nobody notices.
 *
 * **It renders everything the payload carries, and the payload carries nothing
 * it should not.** There is no contact detail in the type at all and no panel,
 * because the backend's projection for this role never selects them. So there
 * is no field being hidden here and no condition keeping one hidden: there is
 * simply nothing else to render.
 *
 * A `404` becomes `<InterviewNotFound />` and says nothing about why. For this
 * role the API answers a round outside their own byte-identically to one that
 * does not exist, so the client genuinely cannot tell the two apart — and
 * guessing in the copy would hand back exactly what the API withheld.
 */
export const InterviewerInterviewDetail: React.FC<InterviewerInterviewDetailProps> = ({
  interviewId,
}) => {
  // `/interviews/abc` never reaches the network — the id is visibly wrong, so
  // the not-found state renders straight away.
  const parsedId = parseInterviewId(interviewId);
  const interviewQuery = useInterviewerInterviewQuery(parsedId);

  if (parsedId === null) {
    return <InterviewNotFound backHref="/my-interviews" backLabel="Back to my interviews" />;
  }

  if (interviewQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (interviewQuery.isError) {
    if (interviewQuery.error instanceof ApiError && interviewQuery.error.status === 404) {
      return <InterviewNotFound backHref="/my-interviews" backLabel="Back to my interviews" />;
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Could not load this interview.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void interviewQuery.refetch()}
          disabled={interviewQuery.isFetching}
        >
          {interviewQuery.isFetching ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  const { interview } = interviewQuery.data;

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/my-interviews"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          My interviews
        </Link>

        {/* Above everything else, and in a destructive tone: a cancellation the
            interviewer scrolls past is worse than no page at all. */}
        {interview.status === 'CANCELLED' && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
            This interview was cancelled.
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {interview.candidate.name}
          </h1>
          <p className="text-sm text-muted-foreground">{interview.role.title}</p>
          <InterviewStatusBadge status={interview.status} />
        </div>
      </div>

      <dl className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Round</dt>
          <dd className="font-medium">{interviewTypeLabel(interview.type)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Stage</dt>
          {/* What the round is FOR, which the API does not require to match the
              application's current stage — a recruiter routinely schedules
              ahead. Rendered as-is, with no comparison to anything. */}
          <dd className="font-medium">{PIPELINE_STAGE_LABELS[interview.stage]}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">When</dt>
          <dd>
            {formatAbsolute(interview.scheduledAt)}{' '}
            <span className="text-muted-foreground">({formatRelative(interview.scheduledAt)})</span>
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <InterviewStatusBadge status={interview.status} />
          </dd>
        </div>
      </dl>

      {/*
        The panel's assessments, then this interviewer's own form — the feedback
        feature's half of this page.

        It is mounted unconditionally, and that is safe for the same reason the
        rest of this component is: an interviewer who is not on this round never
        gets here, because the query above already answered `404` and the
        not-found view returned instead. There is no assignment check in the
        feedback feature and there must not be one.

        `status` is passed so the form can hide itself on a cancelled round. That
        is UX — `409 INTERVIEW_CANCELLED` is the control.
      */}
      <FeedbackSection interviewId={interview.id} status={interview.status} />
    </article>
  );
};
