'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeftIcon, CheckIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { errorBodyOf } from '@/lib/error-details';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { PIPELINE_STAGE_LABELS, pipelineStatusLabel } from '@/features/pipeline/labels';
import { interviewTypeLabel } from '../labels';
import { parseInterviewId, useRecruiterInterviewQuery } from '../hooks/useInterviewsQuery';
import { useUpdateInterviewStatus } from '../hooks/useInterviewMutations';
import { InterviewNotFound } from './InterviewNotFound';
import { InterviewPanel } from './InterviewPanel';
import { InterviewStatusBadge } from './InterviewStatusBadge';
import { ScheduleInterviewDialog } from './ScheduleInterviewDialog';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** The loading state, shaped like the detail layout rather than a spinner. */
const DetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-20 rounded-4xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
    </div>
  );
};

interface RecruiterInterviewDetailProps {
  interviewId: string;
}

/**
 * One round, as a recruiter sees it: everything the interviewer's view shows,
 * plus the application's state, the panel and the lifecycle controls.
 *
 * **This component takes a `RecruiterInterview` and could not be handed an
 * interviewer's payload** — the two interfaces are separate, so a mistaken
 * dispatch in the page above is a compile error.
 *
 * **The status actions disappear once a round is terminal**, because the API
 * answers a second change `409 INVALID_STAGE_TRANSITION` and offering an action
 * that always fails is worse than offering none. Hiding them is a convenience;
 * that `409` is the check, and it is still handled below.
 */
export const RecruiterInterviewDetail: React.FC<RecruiterInterviewDetailProps> = ({
  interviewId,
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false);

  const parsedId = parseInterviewId(interviewId);
  const interviewQuery = useRecruiterInterviewQuery(parsedId);
  const statusMutation = useUpdateInterviewStatus();

  const isUpdating = statusMutation.isPending;

  if (parsedId === null) {
    return <InterviewNotFound backHref="/interviews" backLabel="Back to interviews" />;
  }

  if (interviewQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (interviewQuery.isError) {
    if (interviewQuery.error instanceof ApiError && interviewQuery.error.status === 404) {
      return <InterviewNotFound backHref="/interviews" backLabel="Back to interviews" />;
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
  const { application } = interview;
  const isTerminal = interview.status !== 'SCHEDULED';

  const changeStatus = async (status: 'COMPLETED' | 'CANCELLED') => {
    try {
      await statusMutation.mutateAsync({ interviewId: parsedId, status });
      setConfirmCancel(false);
      toast.success(
        status === 'COMPLETED' ? 'Interview marked completed.' : 'Interview cancelled.',
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      if (errorBodyOf(error)?.code === 'INVALID_STAGE_TRANSITION') {
        // Somebody closed it first. `onSettled` has already invalidated, so the
        // controls are about to disappear on their own.
        setConfirmCancel(false);
        toast.error('This interview is already closed.');
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setConfirmCancel(false);
        toast.error('This interview no longer exists.');
        return;
      }

      toast.error(GENERIC_ERROR_MESSAGE);
    }
  };

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

        {interview.status === 'CANCELLED' && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
            This interview was cancelled.
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {application.candidate.name}
            </h1>
            <p className="text-sm text-muted-foreground">{application.role.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <InterviewStatusBadge status={interview.status} />
              <Badge variant="outline">
                Application: {pipelineStatusLabel(application.status)} ·{' '}
                {PIPELINE_STAGE_LABELS[application.currentStage]}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/*
              The schedule dialog's one reachable call site today. The
              application is already in hand here, which is what it needs — the
              candidate detail page, owned by the candidate-access feature, is
              the second. Only offered while the application is live; the
              `409 APPLICATION_NOT_ACTIVE` is the check.
            */}
            {application.status === 'ACTIVE' && (
              <ScheduleInterviewDialog
                applicationId={application.id}
                currentStage={application.currentStage}
                triggerLabel="Schedule another round"
              />
            )}

            {!isTerminal && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void changeStatus('COMPLETED')}
                  disabled={isUpdating}
                >
                  <CheckIcon aria-hidden="true" />
                  Mark completed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                  disabled={isUpdating}
                >
                  <XIcon aria-hidden="true" />
                  Cancel interview
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <dl className="grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Round</dt>
          <dd className="font-medium">{interviewTypeLabel(interview.type)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Stage</dt>
          {/* The round's own stage, rendered as-is. It is deliberately not
              compared to the application's: a round scheduled ahead of the move
              is ordinary, not a discrepancy to flag. */}
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
          <dt className="text-muted-foreground">Candidate</dt>
          <dd className="font-medium">{application.candidate.name}</dd>
        </div>
      </dl>

      <div className="border-t pt-6">
        <InterviewPanel interviewId={interview.id} assignments={interview.assignments} />
      </div>

      {/* The feedback list mounts here, and belongs to the feedback feature. */}

      <Dialog
        open={confirmCancel}
        onOpenChange={(nextOpen) => {
          if (isUpdating) {
            return;
          }

          setConfirmCancel(nextOpen);
        }}
      >
        <DialogContent showCloseButton={!isUpdating}>
          <DialogHeader>
            <DialogTitle>Cancel this interview?</DialogTitle>
            <DialogDescription>
              The panel and any feedback already submitted are kept. This cannot be undone — a
              cancelled round cannot be reopened.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={isUpdating}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => void changeStatus('CANCELLED')}
              disabled={isUpdating}
            >
              {isUpdating ? 'Cancelling…' : 'Cancel interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
};
