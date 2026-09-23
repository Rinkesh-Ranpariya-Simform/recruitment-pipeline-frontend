'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { formatAbsolute } from '@/lib/format-date';
import { stageLabel } from '../labels';
import type { Application } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { StageTimeline } from './StageTimeline';

interface ApplicationCardProps {
  application: Application;
}

/**
 * One application, as the person who made it sees it:
 *
 * ```
 *   Senior Backend Engineer                                  In progress
 *   Applied: 15 Sep 2026 · Stage: Interview
 *   Applied → Screened (phone screen) → Interview (technical)
 * ```
 *
 * The timeline is the applications feature's addition, and it is the brief's
 * §3.5 complaint answered for the person it is actually about: a candidate who
 * could previously read "Stage: Interview" and nothing else can now see how they
 * got there and what is still pending.
 *
 * **It carries no interviewer, rating, note or override reason** — the backend
 * selects none of them on a candidate's path, so there is nothing here to hide
 * and nothing a future edit to this component could reveal. See `TimelineNode`.
 *
 * `roundBasePath` is deliberately absent: a candidate has no round route, and
 * every request from one would be a `403`. Their timeline is plain text.
 *
 * The role title links to the position, which may 404 if the requisition has
 * since closed: the application remains, the position does not. The card itself
 * links to `/my-applications/:id`, which shows the same facts with room to breathe.
 */
export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 className="font-semibold">
            <Link
              href={`/jobs/${application.role.id}`}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {application.role.title}
            </Link>
          </h2>
          <ApplicationStatusBadge status={application.status} />
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Applied:</dt>
            <dd>{formatAbsolute(application.createdAt)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Stage:</dt>
            <dd>{stageLabel(application.currentStage)}</dd>
          </div>
        </dl>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Progress
          </p>
          <StageTimeline nodes={application.timeline} />
        </div>

        <Link
          href={`/my-applications/${application.id}`}
          className="inline-block rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          View details
        </Link>
      </CardContent>
    </Card>
  );
};
