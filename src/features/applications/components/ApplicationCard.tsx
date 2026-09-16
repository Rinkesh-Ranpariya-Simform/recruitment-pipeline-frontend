'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { formatAbsolute } from '@/lib/format-date';
import { stageLabel } from '../labels';
import type { Application } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationCardProps {
  application: Application;
}

/**
 * One application, exactly as the brief's example describes it:
 *
 *   Senior Backend Engineer
 *   Applied: 15 Sep 2026 · Status: In progress · Stage: Interview
 *
 * **And nothing else.** No interviewer, feedback, rating, note, override reason
 * or stage history — none are in the payload, which is the point. There is no
 * expander and no detail route to open.
 *
 * The title links to the position, which may 404 if the requisition has since
 * closed: the application remains, the position does not.
 */
export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  return (
    <Card>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  );
};
