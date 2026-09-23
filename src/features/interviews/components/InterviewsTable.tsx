'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import { interviewTypeLabel } from '../labels';
import { InterviewStatusBadge } from './InterviewStatusBadge';
import type { InterviewerInterview, RecruiterInterview } from '../types';

/**
 * The two list tables.
 *
 * **Two components, not one with a `panel?` prop**, because they are handed two
 * different payloads. `InterviewerInterviewsTable` takes rows that have no
 * panel and no contact detail in their type at all, so there is no branch in
 * here that could render either — the guarantee is in the prop type rather than
 * in a condition somebody has to keep correct.
 *
 * They share this file because they share a shape, a skeleton and four of five
 * columns; splitting them would mean keeping two copies of the row layout in
 * step. They share no props type.
 */

const SKELETON_ROWS = 6;

/** Placeholder rows shown while a list loads. `columns` keeps it the right width. */
export const InterviewsTableSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }, (_, index) => (
            <TableHead key={index}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }, (_, row) => (
          <TableRow key={row} className="hover:bg-transparent">
            {Array.from({ length: columns }, (_, cell) => (
              <TableCell key={cell} className="py-3">
                <Skeleton className="h-4 w-24 max-w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * The scheduled time, absolute with the relative form under it.
 *
 * **A past round is rendered exactly like a future one** — no warning tone, no
 * icon. Backfilling a round that already happened is normal, so styling it as a
 * problem would be the client disagreeing with the API about what is ordinary.
 */
const WhenCell: React.FC<{ scheduledAt: string }> = ({ scheduledAt }) => {
  return (
    <div className="flex flex-col">
      <span className="whitespace-nowrap">{formatAbsolute(scheduledAt)}</span>
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {formatRelative(scheduledAt)}
      </span>
    </div>
  );
};

/**
 * A row's click target.
 *
 * The whole row is clickable and the first cell is also a real `<Link>`: the
 * row is what a mouse expects, and the link is what makes the destination
 * keyboard-reachable, middle-clickable and copyable. Matches `RolesTable`.
 */
const useRowNavigation = () => {
  const router = useRouter();

  return (interviewId: number) => (event: React.MouseEvent<HTMLTableRowElement>) => {
    // Let the name link handle its own clicks, so middle-click and ⌘-click
    // still open a new tab.
    if ((event.target as HTMLElement).closest('a')) {
      return;
    }

    router.push(`/interviews/${interviewId}`);
  };
};

interface InterviewerInterviewsTableProps {
  interviews: Array<InterviewerInterview>;
}

/**
 * **Candidate · Role · Round · When · Status** — the walkthrough's columns.
 *
 * The Candidate column renders `candidate.name` and there is no second
 * candidate column, because `InterviewerInterview` carries no second candidate
 * field. **There is no conditional here that could add one.**
 */
export const InterviewerInterviewsTable: React.FC<InterviewerInterviewsTableProps> = ({
  interviews,
}) => {
  const onRowClick = useRowNavigation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Candidate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Round</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interviews.map((interview) => (
          <TableRow
            key={interview.id}
            className="cursor-pointer"
            onClick={onRowClick(interview.id)}
          >
            {/* `max-w-0` with `w-full` lets this cell take the leftover width
                and truncate inside it, so a long name cannot scroll the table
                sideways. */}
            <TableCell className="w-full max-w-0 py-3">
              <Link
                href={`/interviews/${interview.id}`}
                title={interview.candidate.name}
                className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {interview.candidate.name}
              </Link>
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <span className="block max-w-48 truncate" title={interview.role.title}>
                {interview.role.title}
              </span>
            </TableCell>
            <TableCell className="py-3 whitespace-nowrap">
              {interviewTypeLabel(interview.type)}
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <WhenCell scheduledAt={interview.scheduledAt} />
            </TableCell>
            <TableCell className="py-3">
              <InterviewStatusBadge status={interview.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

interface RecruiterInterviewsTableProps {
  interviews: Array<RecruiterInterview>;
}

/**
 * **Candidate · Role · Round · When · Status · Panel.**
 *
 * The Panel column renders **Unassigned** in a warning tone when the round has
 * nobody on it — a scheduled round with an empty panel is the single thing on
 * this screen a recruiter most needs to notice, and a blank cell would not say
 * it.
 */
export const RecruiterInterviewsTable: React.FC<RecruiterInterviewsTableProps> = ({
  interviews,
}) => {
  const onRowClick = useRowNavigation();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Candidate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Round</TableHead>
          <TableHead>When</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Panel</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interviews.map((interview) => (
          <TableRow
            key={interview.id}
            className="cursor-pointer"
            onClick={onRowClick(interview.id)}
          >
            <TableCell className="w-full max-w-0 py-3">
              <Link
                href={`/interviews/${interview.id}`}
                title={interview.application.candidate.name}
                className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {interview.application.candidate.name}
              </Link>
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <span className="block max-w-48 truncate" title={interview.application.role.title}>
                {interview.application.role.title}
              </span>
            </TableCell>
            <TableCell className="py-3 whitespace-nowrap">
              {interviewTypeLabel(interview.type)}
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <WhenCell scheduledAt={interview.scheduledAt} />
            </TableCell>
            <TableCell className="py-3">
              <InterviewStatusBadge status={interview.status} />
            </TableCell>
            <TableCell className="py-3">
              {interview.assignments.length === 0 ? (
                <span className="text-xs font-medium whitespace-nowrap text-destructive">
                  Unassigned
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {interview.assignments.map((assignment) => (
                    <Badge key={assignment.id} variant="outline" className="whitespace-nowrap">
                      {assignment.interviewer.name}
                    </Badge>
                  ))}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
