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
  /**
   * **Two fields, and there is no third** (FE-3, FR-7.3).
   *
   * This component does not accept a `RecruiterCandidate`, so a mistaken
   * dispatch in `[candidateId]/page.tsx` is a **compile error** rather than a
   * recruiter's payload reaching a component written for an interviewer
   * (FE-4, AC-F33). The dispatch protects nothing on its own — the API picks
   * its projection from the verified token, so an interviewer cannot obtain the
   * other shape by any route (AZ-2, AZ-3).
   */
  candidate: InterviewerCandidate;
  /** This interviewer's own rounds with this candidate, and no one else's. */
  interviews: Array<InterviewerCandidateInterview>;
}

/**
 * What an interviewer sees of a candidate: **a name, and their own rounds**
 * (FR-7.1, FR-7.2).
 *
 * **It renders nothing else, because there is nothing else** (FR-7.3, XBE-3,
 * AC-F08). No email. No phone. No other applications, no stage timeline, no
 * override reason, no panel, no feedback — **not hidden, absent**. The props
 * above name every field this component can reach, and the payload behind them
 * carries no more. **There is no field to hide, because there is no field.**
 *
 * A candidate interviewed by two panels shows this interviewer only their own
 * rounds; the API's second query is scoped by the same assignment predicate as
 * the first, so the other panel is not in the response to be filtered out
 * (FR-7.2, EC-05, AC-F09).
 *
 * Rounds link to **`/my-interviews/:id`**, not to `/interviews/:id` as FR-7.2
 * wrote it: the `/interviews` tree is the recruiter's, nested under the
 * application a round belongs to, and an interviewer's payload carries no
 * application id — so they could not build a URL in that tree even if the route
 * admitted them. `/my-interviews/:id` is their own round page and renders the
 * interviewer projection of the same endpoint.
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
