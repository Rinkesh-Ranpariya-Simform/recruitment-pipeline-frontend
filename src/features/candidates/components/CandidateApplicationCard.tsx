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
 * Renders an individual interview round block with type, status, panel, and feedback.
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
 * Application card rendering role, current stage, status, stage history timeline, and interview rounds.
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
            {/* Stage move dropdown menu */}
            <StageMoveMenu application={application} stageOrder={PIPELINE_STAGES} />
          </div>
        )}
      </header>

      <Separator className="my-5" />

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Stage history</h3>
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
