'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { interviewStatusLabel, interviewTypeLabel } from '@/features/interviews/labels';
import { pipelineStageLabel } from '@/features/pipeline/labels';
import { formatAbsolute } from '@/lib/format-date';
import type { InterviewerCandidate, InterviewerCandidateInterview } from '../types';

interface InterviewerCandidateDetailProps {
  /** The candidate profile data available to interviewers. */
  candidate: InterviewerCandidate;
  /** Interview rounds assigned to the current interviewer for this candidate. */
  interviews: Array<InterviewerCandidateInterview>;
}

/**
 * Interviewer candidate detail view displaying candidate name and their assigned interview rounds.
 */
export const InterviewerCandidateDetail: React.FC<InterviewerCandidateDetailProps> = ({
  candidate,
  interviews,
}) => {
  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/candidates"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Candidates
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{candidate.name}</h1>
          <p className="text-sm text-muted-foreground">
            {interviews.length === 1 ? 'Your interview' : 'Your interviews'} with this candidate
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Interviews</h2>

        {interviews.length === 0 ? (
          // Unreachable in practice — an empty list means the API answered
          // `404` and the page is the not-found view by now — and handled
          // anyway, because a screen that renders nothing at all is worse than
          // one that says so.
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No interviews with this candidate.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {interviews.map((interview) => (
              <li key={interview.id}>
                <Card className="p-0 transition-colors hover:border-primary/40 hover:bg-muted/40">
                  <Link
                    href={`/my-interviews/${interview.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {interviewTypeLabel(interview.type)}
                        <span className="text-muted-foreground">
                          {' · '}
                          {pipelineStageLabel(interview.stage)}
                        </span>
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {interview.role.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {/* An undated round is ordinary, not an error state. */}
                        {interview.scheduledAt
                          ? formatAbsolute(interview.scheduledAt)
                          : 'No date set'}
                      </p>
                    </div>

                    <Badge variant="outline">{interviewStatusLabel(interview.status)}</Badge>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
};
