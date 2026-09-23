'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PIPELINE_STAGE_LABELS, pipelineStatusLabel } from '@/features/pipeline/labels';
import { formatAbsolute, formatRelative } from '@/lib/format-date';
import type { RecruiterApplication } from '../types';

/**
 * **Candidate · Role · Stage · Status · Rounds · Applied** — `/interviews`, one
 * row per candidate in an interview process (applications FR-6.1).
 *
 * **There is no action column, and that is the change.** A row here is a whole
 * process, and a process has no single action: the things a recruiter does —
 * set a date, assign a panel, record a verdict — all belong to one round inside
 * it. So the row's only job is to open the process at
 * `/interviews/:applicationId`, and the whole row is the target.
 *
 * The **recruiter's** stage and status vocabulary, from
 * `features/pipeline/labels.ts`, not the candidate's: this table says
 * "Rejected", not "Not selected". Two audiences, two vocabularies.
 */

interface InterviewProcessTableProps {
  applications: Array<RecruiterApplication>;
}

export const InterviewProcessTable: React.FC<InterviewProcessTableProps> = ({ applications }) => {
  const router = useRouter();

  /**
   * The whole row is clickable and the first cell is also a real `<Link>`: the
   * row is what a mouse expects, and the link is what makes the destination
   * keyboard-reachable, middle-clickable and copyable. Matches `RolesTable`.
   */
  const onRowClick = (applicationId: number) => (event: React.MouseEvent<HTMLTableRowElement>) => {
    // Let the name link handle its own clicks, so middle-click and ⌘-click
    // still open a new tab.
    if ((event.target as HTMLElement).closest('a')) {
      return;
    }

    router.push(`/interviews/${applicationId}`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Candidate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Rounds</TableHead>
          <TableHead>Applied</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow
            key={application.id}
            className="cursor-pointer"
            onClick={onRowClick(application.id)}
          >
            {/* `max-w-0` with `w-full` lets this cell take the leftover width
                and truncate inside it, so a long name cannot scroll the table
                sideways. */}
            <TableCell className="w-full max-w-0 py-3">
              <Link
                href={`/interviews/${application.id}`}
                title={application.candidate.name}
                className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {application.candidate.name}
              </Link>
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <span className="block max-w-48 truncate" title={application.role.title}>
                {application.role.title}
              </span>
            </TableCell>
            <TableCell className="py-3 whitespace-nowrap">
              {PIPELINE_STAGE_LABELS[application.currentStage] ?? application.currentStage}
            </TableCell>
            <TableCell className="py-3">
              <Badge variant={application.status === 'REJECTED' ? 'secondary' : 'outline'}>
                {pipelineStatusLabel(application.status)}
              </Badge>
            </TableCell>
            <TableCell className="py-3 text-center tabular-nums">
              {application.interviewCount}
            </TableCell>
            <TableCell className="py-3 text-muted-foreground">
              <div className="flex flex-col">
                <span className="whitespace-nowrap">{formatAbsolute(application.createdAt)}</span>
                <span className="text-xs whitespace-nowrap">
                  {formatRelative(application.createdAt)}
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
