'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge';
import { FeedbackList } from '@/features/feedback/components/FeedbackList';
import { interviewStatusLabel, interviewTypeLabel } from '@/features/interviews/labels';
import { ScheduleInterviewDialog } from '@/features/interviews/components/ScheduleInterviewDialog';
import { pipelineStageLabel } from '@/features/pipeline/labels';
import { PIPELINE_STAGES } from '@/features/pipeline/search-params';
import { StageMoveMenu } from '@/features/pipeline/components/StageMoveMenu';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { StageTimeline } from './StageTimeline';
import type { CandidateRound, RecruiterCandidateApplication } from '../types';

interface CandidateRoundBlockProps {
  round: CandidateRound;
  /** The round page is nested under the application it belongs to. */
  applicationId: number;
}

/**
 * One round: its type, stage, date and status, its panel, and its feedback
 * (FR-6.1, FR-6.2, FR-6.3).
 *
 * **`<FeedbackList>` is given `entries`, so it issues no request** (D-7, FE-7,
 * XBE-6). That is the whole reason the feedback feature's list takes an
 * optional `entries` prop: a candidate with five rounds costs **zero** extra
 * calls here rather than five (PERF-2, EC-15, AC-F28).
 *
 * `editable={false}`, because a recruiter did not conduct the interview and may
 * not write or edit an assessment. That is an affordance; the API's `403` on
 * `POST` and `PATCH` is the control.
 *
 * The round links to `/interviews/:applicationId/:interviewId` rather than
 * FR-6.4's `/interviews/{id}`: the recruiter's round route is nested under its
 * application, which is a routing fact this page has in hand.
 */
const CandidateRoundBlock: React.FC<CandidateRoundBlockProps> = ({ round, applicationId }) => {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href={`/interviews/${applicationId}/${round.id}`}
            className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {interviewTypeLabel(round.type)}
            <span className="text-muted-foreground">
              {' · '}
              {pipelineStageLabel(round.stage)}
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            {/* An undated round is ordinary, not an error state. */}
            {round.scheduledAt ? formatAbsolute(round.scheduledAt) : 'No date set'}
          </p>
        </div>

        <Badge variant="outline">{interviewStatusLabel(round.status)}</Badge>
      </div>

      {round.assignments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Panel</span>
          {round.assignments.map((assignment) => (
            <Badge key={assignment.id} variant="secondary">
              {assignment.interviewer.name}
            </Badge>
          ))}
        </div>
      )}

      <FeedbackList interviewId={round.id} editable={false} entries={round.feedback} />
    </div>
  );
};

interface CandidateApplicationCardProps {
  application: RecruiterCandidateApplication;
}

/**
 * One application, with everything that happened to it (FR-4.3).
 *
 * The role title, the current stage, the status and the time at that stage;
 * then the **stage timeline** (FR-5), then the application's **rounds** with
 * their panels and their feedback (FR-6).
 *
 * **The Move menu, the override dialog and the schedule dialog are imported
 * from the pipeline and interviews features** (FR-4.4, FE-6). This feature
 * declares no second copy of any of them — a second copy would be a second
 * place for their validation and their error handling to drift, and this page
 * is the schedule dialog's second call site, which the interviews feature
 * already anticipated.
 *
 * **Both write controls are hidden on a terminal application** (FR-6.5, EC-16,
 * AC-F21). That is UX: the API answers a move on a `HIRED` or `REJECTED`
 * application with `409 APPLICATION_NOT_ACTIVE` whether or not the button is on
 * screen, and that `409` is the control (AZ-6).
 */
export const CandidateApplicationCard: React.FC<CandidateApplicationCardProps> = ({
  application,
}) => {
  const isActive = application.status === 'ACTIVE';

  return (
    <Card className="gap-0 p-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/roles/${application.role.id}`}
              className="text-lg font-semibold tracking-tight hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {application.role.title}
            </Link>
            <ApplicationStatusBadge status={application.status} />
          </div>

          <p className="text-sm text-muted-foreground">
            {pipelineStageLabel(application.currentStage)} ·{' '}
            <span title={formatAbsolute(application.stageEnteredAt)}>
              at this stage since {formatRelative(application.stageEnteredAt)}
            </span>
          </p>
        </div>

        {isActive && (
          <div className="flex flex-wrap items-center gap-2">
            <ScheduleInterviewDialog
              applicationId={application.id}
              currentStage={application.currentStage}
              triggerLabel="Schedule interview"
            />
            {/*
              `stageOrder` is the four stages in board order. The pipeline
              feature normally passes the API's own densified array, which this
              page has no equivalent of — and `PIPELINE_STAGES` is exactly what
              that array contains, documented there as **display order, not a
              transition graph**. The menu still asserts no legality: a refused
              move comes back `409` with `details.allowed`, and the menu
              rebuilds from that (FE-6, pipeline FE-8).
            */}
            <StageMoveMenu application={application} stageOrder={PIPELINE_STAGES} />
          </div>
        )}
      </header>

      <Separator className="my-5" />

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Stage history</h3>
        {/* Rendered in the API's order, oldest first, and never re-sorted here
            (FR-5.1, XBE-5). */}
        <StageTimeline entries={application.stageHistory} />
      </section>

      <Separator className="my-5" />

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          {application.interviews.length === 1
            ? '1 round'
            : `${application.interviews.length} rounds`}
        </h3>

        {application.interviews.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No interviews scheduled for this application.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {application.interviews.map((round) => (
              <CandidateRoundBlock key={round.id} round={round} applicationId={application.id} />
            ))}
          </div>
        )}
      </section>
    </Card>
  );
};
