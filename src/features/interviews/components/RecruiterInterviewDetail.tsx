'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeftIcon, CalendarOffIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

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
import { parseApplicationId } from '@/features/applications/hooks/useApplicationsQuery';
import { parseInterviewId, useRecruiterInterviewQuery } from '../hooks/useInterviewsQuery';
import { useUpdateInterview } from '../hooks/useInterviewMutations';
import { InterviewNotFound } from './InterviewNotFound';
import { FeedbackList } from '@/features/feedback/components/FeedbackList';
import { EditInterviewDateDialog } from './EditInterviewDateDialog';
import { InterviewDecisionActions } from './InterviewDecisionActions';
import { InterviewOutcomeBadge } from './InterviewOutcomeBadge';
import { InterviewPanel } from './InterviewPanel';
import { InterviewStatusBadge } from './InterviewStatusBadge';

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
  /** The `:applicationId` segment — the process this round is claimed to be in. */
  applicationId: string;
  interviewId: string;
}

/**
 * `/interviews/:applicationId/:interviewId` — one round, as a recruiter sees
 * it: everything the interviewer's view shows, plus the application's state,
 * the panel and the lifecycle controls.
 *
 * **Both segments are checked, and a round that does not belong to the named
 * process is a 404 here.** The API authorizes on the round's id alone, so
 * `/interviews/999/80033` would otherwise load round 80033 perfectly well and
 * render it under a breadcrumb pointing at somebody else's process. Comparing
 * the segment against the application the payload actually carries is what
 * keeps the URL's two halves from disagreeing — a correctness check on the
 * page's own claims, not a security one.
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
  applicationId,
  interviewId,
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false);

  const parsedId = parseInterviewId(interviewId);
  const parsedApplicationId = parseApplicationId(applicationId);
  const interviewQuery = useRecruiterInterviewQuery(parsedId);
  const statusMutation = useUpdateInterview();

  const isUpdating = statusMutation.isPending;

  // Back to the process when the URL names a real one, and to the list when it
  // does not — there is no page to return to at `/interviews/abc`.
  const processHref =
    parsedApplicationId === null ? '/interviews' : `/interviews/${parsedApplicationId}`;
  const processLabel = parsedApplicationId === null ? 'Back to interviews' : 'Back to this process';

  if (parsedId === null || parsedApplicationId === null) {
    return <InterviewNotFound backHref="/interviews" backLabel="Back to interviews" />;
  }

  if (interviewQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (interviewQuery.isError) {
    if (interviewQuery.error instanceof ApiError && interviewQuery.error.status === 404) {
      return <InterviewNotFound backHref={processHref} backLabel={processLabel} />;
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

  // The round exists, but not inside the process the URL names. Same answer as
  // a round that does not exist: there is no such page.
  if (application.id !== parsedApplicationId) {
    return <InterviewNotFound backHref="/interviews" backLabel="Back to interviews" />;
  }

  const isTerminal = interview.status !== 'SCHEDULED';

  /**
   * Whether Select / Reject is offered.
   *
   * All three conditions are the API's, restated — a decided round is `409
   * DECISION_ALREADY_RECORDED`, a cancelled one `409 INTERVIEW_CANCELLED`, and a
   * closed application `409 APPLICATION_NOT_ACTIVE`. **Those 409s are the
   * check**; this only decides what is worth offering, and each is handled in
   * `InterviewDecisionActions` for the row that went stale in another tab.
   *
   * A round with no date is deliberately NOT excluded: a phone screen that
   * happened on a call nobody booked is still a round with a verdict.
   */
  const canDecide = !isTerminal && interview.outcome === null && application.status === 'ACTIVE';

  // `COMPLETED` is no longer reachable from this page: a round is completed by
  // recording a verdict on it, which is one action rather than two and cannot
  // leave a round marked done with nobody having said what happened. Cancelling
  // stays, because a round that will not happen has no verdict to record.
  const changeStatus = async (status: 'CANCELLED') => {
    try {
      await statusMutation.mutateAsync({ interviewId: parsedId, status });
      setConfirmCancel(false);
      toast.success('Interview cancelled.');
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
        {/*
          Back to the PROCESS, not to the list of candidates. This page is a
          leaf of one candidate's process, and the thing a recruiter wants after
          deciding a round is the timeline that decision just moved — which is
          also the segment directly above this one in the URL.
        */}
        <Link
          href={`/interviews/${application.id}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {application.candidate.name} · {application.role.title}
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
            <h1 className="text-2xl font-semibold tracking-tight wrap-break-word">
              {application.candidate.name}
            </h1>
            <p className="text-sm text-muted-foreground">{application.role.title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <InterviewStatusBadge status={interview.status} />
              <InterviewOutcomeBadge outcome={interview.outcome} decidedBy={interview.decidedBy} />
              <Badge variant="outline">
                Application: {pipelineStatusLabel(application.status)} ·{' '}
                {PIPELINE_STAGE_LABELS[application.currentStage]}
              </Badge>
            </div>
          </div>

          {/*
            The decision pair leads, because it is what a recruiter opens this
            page to do. The date edit sits beside it, and Cancel is last and
            quietest — it is the rare action.

            Every one of these is an affordance. Each is refused by the API with
            its own `409` when the round has gone stale in another tab, and each
            of those is handled at the call site.
          */}
          <div className="flex flex-wrap items-center gap-2">
            {canDecide && <InterviewDecisionActions interview={interview} />}

            {!isTerminal && (
              <>
                <EditInterviewDateDialog
                  interviewId={interview.id}
                  scheduledAt={interview.scheduledAt}
                />
                <Button
                  variant="ghost"
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
          {/* A round can exist before its date does. "No date yet" is said in
              words and in a tone a recruiter will notice, because it is the one
              thing on this row they still have to do. */}
          <dd>
            {interview.scheduledAt === null ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-500">
                <CalendarOffIcon className="size-4" aria-hidden="true" />
                No date yet
              </span>
            ) : (
              <>
                {formatAbsolute(interview.scheduledAt)}{' '}
                <span className="text-muted-foreground">
                  ({formatRelative(interview.scheduledAt)})
                </span>
              </>
            )}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Decision</dt>
          <dd className="font-medium">
            {interview.outcome === null ? (
              <span className="text-muted-foreground">Not decided yet</span>
            ) : (
              <>
                {interview.outcome === 'SELECTED' ? 'Selected' : 'Rejected'}
                {interview.decidedAt && (
                  <span className="font-normal text-muted-foreground">
                    {' · '}
                    {formatAbsolute(interview.decidedAt)}
                  </span>
                )}
                {interview.decidedBy && (
                  <span className="font-normal text-muted-foreground">
                    {' by '}
                    {interview.decidedBy.name}
                  </span>
                )}
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="border-t pt-6">
        <InterviewPanel interviewId={interview.id} assignments={interview.assignments} />
      </div>

      {/*
        Every panellist's assessment, read-only.

        `editable={false}` is explicit rather than implied by the fact that a
        recruiter's id never matches an author's: two independent reasons the
        Edit button cannot render here, and **neither is what makes it safe.**
        `POST` and `PATCH` are interviewer-only at the API, so a recruiter firing
        either by hand gets a `403` — that is the control, and the missing form
        is only an affordance.
      */}
      <section className="flex flex-col gap-4 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Feedback</h2>
        <FeedbackList interviewId={interview.id} editable={false} />
      </section>

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
