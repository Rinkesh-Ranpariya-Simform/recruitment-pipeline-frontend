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
  /**
   * **`Array<InterviewerCandidate>` — a type with exactly `id` and `name`**
   * (FR-3.4, FE-3, FE-4).
   *
   * This component does not accept `Array<RecruiterCandidateRow>`, so handing
   * it the recruiter's rows is a **compile error** rather than a leak nobody
   * notices. That is the whole of why there are two tables instead of one with
   * a role check (FR-11.2, AZ-3, AC-F33).
   */
  candidates: Array<InterviewerCandidate>;
}

/**
 * The interviewer's candidate list: **one column, Name** (FR-3.1, AC-F05).
 *
 * **There is no email column, no phone column, and no conditional that could
 * add one** (SEC-1, SEC-2, AC-F06). Not because they are hidden — because the
 * prop type has no such field and the payload behind it carries none. A grep of
 * this feature for a contact field on a candidate returns nothing (AC-F32).
 *
 * **There is no search box on this page either** (FR-3.2, D-6, EC-02). A search
 * over people is precisely the affordance this feature exists to deny an
 * interviewer, and the API answers their `?q=` with a `400` regardless — the
 * missing input is not the control (XBE-8, SEC-6, AC-M04).
 *
 * FR-3.1 also asks for a count of this interviewer's rounds with each person.
 * **The list payload carries two fields and no such count**, and asking the API
 * to add one would widen the very projection this feature narrows, so the
 * column is not rendered. The count is on each candidate's own page, where
 * their rounds are.
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
