'use client';

import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { formatAbsolute } from '@/lib/format-date';
import type { Job } from '../types';

interface JobCardProps {
  job: Job;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <Card className="relative transition-colors hover:ring-ring/50">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-semibold">
            <Link
              href={`/jobs/${job.id}`}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="absolute inset-0" aria-hidden="true" />
              {job.title}
            </Link>
          </h2>
          <p className="text-xs text-muted-foreground">Posted {formatAbsolute(job.createdAt)}</p>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
      </CardContent>
    </Card>
  );
};
