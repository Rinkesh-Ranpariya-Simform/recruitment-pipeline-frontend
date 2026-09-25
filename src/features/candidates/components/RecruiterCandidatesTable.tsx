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
import { pipelineStageLabel } from '@/features/pipeline/labels';
import { formatAbsolute } from '@/lib/format-date';
import type { RecruiterCandidateRow } from '../types';

/** A full page's worth, per the list state matrix. */
const SKELETON_ROWS = 8;

/** How many application badges fit in a row before the rest become a count (FR-2.2). */
const VISIBLE_APPLICATIONS = 2;

/** No phone, no location, no anything: an em dash, never a blank cell (EC-06, AC-F12). */
const EMPTY = '—';

const RecruiterCandidatesTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead className="w-full">Applications</TableHead>
        <TableHead className="text-right">Joined</TableHead>
      </TableRow>
    </TableHeader>
  );
};

/** Same header, columns and row height as the real table, so nothing shifts on load. */
export const RecruiterCandidatesTableSkeleton: React.FC = () => {
  return (
    <Table>
      <RecruiterCandidatesTableHead />
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="py-3">
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-44" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-5 w-40 rounded-4xl" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="ml-auto h-4 w-32" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

interface RecruiterCandidatesTableProps {
  /**
   * **`Array<RecruiterCandidateRow>`**, which `InterviewerCandidatesTable` does
   * not accept and which does not accept an interviewer's rows (FE-4, AC-F33).
   * The two tables share no props type, so a mistaken dispatch is a compile
   * error rather than a rendering bug nobody notices.
   */
  candidates: Array<RecruiterCandidateRow>;
}

/**
 * The recruiter's candidate list: **Name · Email · Phone · Applications ·
 * Joined** (FR-2.1, AC-F11).
 *
 * Contact columns render here because **the payload contains them** — a
 * recruiter's projection selects `email` and joins the profile for `phone`.
 * They are not revealed by a role check in this component; there is no such
 * check, and an interviewer's rows would not type-check here at all (SEC-2,
 * FR-11.2, AZ-3).
 *
 * `phone: null` renders `—` rather than an empty cell (EC-06, AC-F12): a blank
 * cell reads as a rendering bug, and "no number recorded" is ordinary.
 *
 * Applications render as badges of role title + current stage, with the
 * remainder collapsed into a count past the second (FR-2.2) — a table row is
 * not where you read a list of five.
 *
 * The whole row is clickable and the name is also a real `<Link>`: the row is
 * what a mouse expects, and the link is what makes `/candidates/{id}`
 * keyboard-reachable, middle-clickable and copyable (FR-2.5).
 */
export const RecruiterCandidatesTable: React.FC<RecruiterCandidatesTableProps> = ({
  candidates,
}) => {
  const router = useRouter();

  return (
    <Table>
      <RecruiterCandidatesTableHead />
      <TableBody>
        {candidates.map((candidate) => {
          const shown = candidate.applications.slice(0, VISIBLE_APPLICATIONS);
          const hidden = candidate.applicationCount - shown.length;

          return (
            <TableRow
              key={candidate.id}
              className="cursor-pointer"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) {
                  return;
                }

                router.push(`/candidates/${candidate.id}`);
              }}
            >
              <TableCell className="py-3">
                <Link
                  href={`/candidates/${candidate.id}`}
                  title={candidate.name}
                  className="block font-medium whitespace-nowrap hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {candidate.name}
                </Link>
              </TableCell>

              <TableCell className="py-3 text-muted-foreground">
                <span className="block max-w-56 truncate" title={candidate.email}>
                  {candidate.email}
                </span>
              </TableCell>

              <TableCell className="py-3 whitespace-nowrap text-muted-foreground">
                {candidate.phone ?? EMPTY}
              </TableCell>

              <TableCell className="w-full max-w-0 py-3">
                {candidate.applicationCount === 0 ? (
                  <span className="text-muted-foreground">{EMPTY}</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {shown.map((application) => (
                      <Badge key={application.id} variant="outline" className="max-w-full">
                        <span className="truncate">{application.role.title}</span>
                        <span className="text-muted-foreground">
                          {' · '}
                          {pipelineStageLabel(application.currentStage)}
                        </span>
                      </Badge>
                    ))}
                    {hidden > 0 && (
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        +{hidden} more
                      </span>
                    )}
                  </div>
                )}
              </TableCell>

              <TableCell className="py-3 text-right whitespace-nowrap text-muted-foreground">
                {formatAbsolute(candidate.createdAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
