'use client';

import Link from 'next/link';
import { CalendarOffIcon, ChevronRightIcon, UsersIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { PIPELINE_STAGE_LABELS } from '@/features/pipeline/labels';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { cn } from 'cn';
import { TIMELINE_TYPE_LABELS } from '../labels';
import type { ApplicationInterview } from '../types';

/**
 * One past or upcoming round, as a card on the process page
 * `/interviews/:applicationId` (applications FR-4.5).
 *
 * **The whole card is the link.** Its job is to get a recruiter to
 * `/interviews/:applicationId/:interviewId`, where the panel, the feedback and
 * the Select / Reject pair live — so there is no second click target on it and
 * no action inside it.
 *
 * `applicationId` is a prop rather than something read from the payload because
 * the round's href is nested under the process, and the card is handed one
 * round rather than the application it belongs to.
 *
 * The left border carries the verdict — green selected, red rejected, neutral
 * undecided — matching `StageTimeline` exactly, so the same round reads the same
 * way in both places on one page. The badge says it in words as well, because
 * colour alone must never carry meaning.
 *
 * **An undated round says so explicitly**, with its own icon and phrase rather
 * than a blank cell: a round created from the applications table has no date
 * until someone sets one, and "no date yet" is a thing a recruiter needs to act
 * on rather than an empty space to skim past.
 */

const OUTCOME_BORDER: Record<string, string> = {
  SELECTED: 'border-l-emerald-600',
  REJECTED: 'border-l-destructive',
};

interface InterviewRoundCardProps {
  applicationId: number;
  interview: ApplicationInterview;
}

export const InterviewRoundCard: React.FC<InterviewRoundCardProps> = ({
  applicationId,
  interview,
}) => {
  const isCancelled = interview.status === 'CANCELLED';

  return (
    <Link
      href={`/interviews/${applicationId}/${interview.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-xl border border-l-4 bg-card p-4 transition-colors',
        'hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        interview.outcome ? OUTCOME_BORDER[interview.outcome] : 'border-l-border',
        isCancelled && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {TIMELINE_TYPE_LABELS[interview.type] ?? interview.type}
          </span>
          <Badge variant="outline" className="font-normal">
            {PIPELINE_STAGE_LABELS[interview.stage] ?? interview.stage}
          </Badge>

          {isCancelled ? (
            <Badge variant="destructive">Cancelled</Badge>
          ) : interview.outcome === 'SELECTED' ? (
            <Badge className="border-emerald-600/40 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
              Selected
            </Badge>
          ) : interview.outcome === 'REJECTED' ? (
            <Badge variant="destructive">Rejected</Badge>
          ) : (
            <Badge variant="secondary">Awaiting decision</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {interview.scheduledAt ? (
            <span>
              {formatAbsolute(interview.scheduledAt)}{' '}
              <span className="opacity-80">({formatRelative(interview.scheduledAt)})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-500">
              <CalendarOffIcon className="size-3.5" aria-hidden="true" />
              No date set
            </span>
          )}

          <span className="inline-flex items-center gap-1.5">
            <UsersIcon className="size-3.5" aria-hidden="true" />
            {interview.assignments.length === 0 ? (
              <span className="font-medium text-destructive">Unassigned</span>
            ) : (
              interview.assignments.map((assignment) => assignment.interviewer.name).join(', ')
            )}
          </span>
        </div>
      </div>

      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
};
