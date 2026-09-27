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

/** Table component listing candidates active in interview processes. */

interface InterviewProcessTableProps {
  applications: Array<RecruiterApplication>;
}

export const InterviewProcessTable: React.FC<InterviewProcessTableProps> = ({ applications }) => {
  const router = useRouter();

  /** Interactive table row that navigates to the application interview detail. */
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
