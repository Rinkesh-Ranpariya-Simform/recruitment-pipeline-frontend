'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
import type { InterviewerInterview } from '../types';

/**
 * The interviewer's list table, and the skeleton it shares with nothing else
 * any more.
 *
 * It takes `InterviewerInterview` rows, which have **no panel and no contact
 * detail in their type at all** — so there is no branch in here that could
 * render either. The guarantee is in the prop type rather than in a condition
 * somebody has to keep correct.
 *
 * The recruiter's counterpart used to live beside it; see the note at the foot
 * of this file for why it does not.
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
const WhenCell: React.FC<{ scheduledAt: string | null }> = ({ scheduledAt }) => {
  if (scheduledAt === null) {
    // A round can exist before its date does. "No date yet" is a fact an
    // interviewer needs — it is the row they should chase — so it is said in
    // words rather than left as an empty cell to skim past.
    return <span className="text-xs font-medium whitespace-nowrap">No date yet</span>;
  }

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
 * A row's click target: `/my-interviews/:interviewId`, the interviewer's own
 * leaf.
 *
 * **Not `/interviews/…`** — that tree is the recruiter's, and its round page is
 * nested under the application it belongs to. `InterviewerInterview` carries no
 * application id, deliberately, so a row here could not build that path even if
 * it were allowed to. The projection and the route agree.
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

    router.push(`/my-interviews/${interviewId}`);
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
                href={`/my-interviews/${interview.id}`}
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

/**
 * **`RecruiterInterviewsTable` was removed by the applications feature**, and
 * its absence is deliberate rather than an oversight.
 *
 * `/interviews` no longer lists rounds: it lists the candidates in an interview
 * process, one row per candidate per requisition, and a recruiter reaches a
 * round through that candidate's application page. The flat list it served
 * showed one person once per round, which made "who am I running a process
 * for?" a question you had to answer by eye.
 *
 * A recruiter's list of rounds now exists only inside one application, at
 * `/interviews/:applicationId`, as `InterviewRoundCard`s. If a flat one is ever
 * wanted back, it belongs beside that card rather than as a second table here.
 */
