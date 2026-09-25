'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PIPELINE_STAGES } from '@/features/pipeline/search-params';
import { StageMoveMenu } from '@/features/pipeline/components/StageMoveMenu';
import { pipelineStageLabel } from '@/features/pipeline/labels';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { useRecruiterCandidatesQuery } from '../hooks/useCandidatesQuery';
import type { PipelineStage } from '../types';

interface PipelineDrillDownProps {
  roleId: number;
  stage: PipelineStage;
}

/**
 * Who is in one cell of the pipeline board (FR-10, and the Revision at the top
 * of this feature's spec).
 *
 * **This replaces the pipeline feature's "Candidate detail is not available
 * yet." placeholder**, which was a stated placeholder from the start waiting on
 * `GET /api/candidates`. That endpoint exists now, so the board's stage cards
 * become links and this renders the real list (FR-10.1, AC-F41).
 *
 * It calls `?roleId=&stage=&status=ACTIVE` — **the same `listCandidates`
 * wrapper** the `/candidates` page and the Applicants section use, with
 * different parameters (API-7). `status: 'ACTIVE'` is the point of a board
 * cell: a candidate the board counts is one still in flight, and the API ANDs
 * all three filters inside one application predicate, so a row here has an
 * application to **that** role at **that** stage that is still live.
 *
 * **One request when a cell is opened, and none while no cell is open**
 * (PERF-6, AC-F30) — `/pipeline` renders this only when both filters are set,
 * so there is nothing to disable here.
 *
 * Each row carries the pipeline feature's own **Move menu** (FR-10.2, FE-6).
 * No second copy: moving someone from the drill-down and moving them from
 * anywhere else must behave identically, including their error handling.
 */
export const PipelineDrillDown: React.FC<PipelineDrillDownProps> = ({ roleId, stage }) => {
  const candidatesQuery = useRecruiterCandidatesQuery({ roleId, stage, status: 'ACTIVE' });

  const candidates = candidatesQuery.data?.candidates ?? [];
  const pagination = candidatesQuery.data?.pagination;

  if (candidatesQuery.isPending) {
    return <DrillDownSkeleton />;
  }

  if (candidatesQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this stage.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void candidatesQuery.refetch()}
          disabled={candidatesQuery.isFetching}
        >
          {candidatesQuery.isFetching ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 border-t pt-6">
      <h2 className="text-sm font-medium text-muted-foreground">
        At {pipelineStageLabel(stage)}
        {pagination && <span className="ml-1.5 text-foreground">({pagination.total})</span>}
      </h2>

      {candidates.length === 0 ? (
        // Reachable when the board's count and this list disagree — someone
        // moved a candidate between the two requests. Saying so beats an empty
        // table with no explanation.
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Nobody is at this stage any more.
        </p>
      ) : (
        <Table>
          <DrillDownTableHead />
          <TableBody>
            {candidates.map((candidate) => {
              const application = candidate.applications.find(
                (entry) => entry.role.id === roleId && entry.currentStage === stage,
              );

              return (
                <TableRow key={candidate.id}>
                  <TableCell className="w-full max-w-0 py-3">
                    <Link
                      href={`/candidates/${candidate.id}`}
                      title={candidate.name}
                      className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {candidate.name}
                    </Link>
                  </TableCell>

                  <TableCell className="py-3 whitespace-nowrap text-muted-foreground">
                    {application ? (
                      <span title={formatAbsolute(application.stageEnteredAt)}>
                        {formatRelative(application.stageEnteredAt)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>

                  <TableCell className="py-3 text-right">
                    {/* Only when this candidate's application to this role is in
                        hand — there is nothing to move otherwise. */}
                    {application && (
                      <StageMoveMenu application={application} stageOrder={PIPELINE_STAGES} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
};

const DrillDownTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-full">Candidate</TableHead>
        <TableHead>Time at stage</TableHead>
        <TableHead className="text-right">Move</TableHead>
      </TableRow>
    </TableHeader>
  );
};

const DrillDownSkeleton: React.FC = () => {
  return (
    <section className="flex flex-col gap-4 border-t pt-6">
      <Skeleton className="h-4 w-32" />
      <Table>
        <DrillDownTableHead />
        <TableBody>
          {Array.from({ length: 3 }, (_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell className="py-3">
                <Skeleton className="h-4 w-44 max-w-full" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="py-3">
                <Skeleton className="ml-auto h-8 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
};
