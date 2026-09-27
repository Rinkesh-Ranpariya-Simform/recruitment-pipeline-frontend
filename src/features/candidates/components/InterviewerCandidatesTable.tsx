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
import type { InterviewerCandidate } from '../types';

/** A short list — an interviewer has a handful of candidates, not a page of them. */
const SKELETON_ROWS = 3;

const InterviewerCandidatesTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-full">Name</TableHead>
      </TableRow>
    </TableHeader>
  );
};

/** Same header and row height as the real table, so nothing shifts on load. */
export const InterviewerCandidatesTableSkeleton: React.FC = () => {
  return (
    <Table>
      <InterviewerCandidatesTableHead />
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="py-3">
              <Skeleton className="h-4 w-48 max-w-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

interface InterviewerCandidatesTableProps {
  candidates: Array<InterviewerCandidate>;
}

/**
 * Candidate table for interviewers, displaying only the candidate name.
 */
export const InterviewerCandidatesTable: React.FC<InterviewerCandidatesTableProps> = ({
  candidates,
}) => {
  const router = useRouter();

  return (
    <Table>
      <InterviewerCandidatesTableHead />
      <TableBody>
        {candidates.map((candidate) => (
          <TableRow
            key={candidate.id}
            className="cursor-pointer"
            onClick={(event) => {
              // Let the name link handle its own clicks, so middle-click and
              // ⌘-click still open a new tab.
              if ((event.target as HTMLElement).closest('a')) {
                return;
              }

              router.push(`/candidates/${candidate.id}`);
            }}
          >
            <TableCell className="w-full max-w-0 py-3">
              <Link
                href={`/candidates/${candidate.id}`}
                title={candidate.name}
                className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {candidate.name}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
