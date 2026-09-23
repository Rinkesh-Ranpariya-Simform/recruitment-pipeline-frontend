'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Placeholder rows shared by both recruiter tables built on
 * `RecruiterApplication` — the inbox at `/applications` and the process list at
 * `/interviews`.
 *
 * `columns` exists because the two tables are no longer the same width: the
 * inbox is four columns, the process list is six. A fixed count would make the
 * first paint the wrong shape on one of them, which is the one thing a skeleton
 * is for.
 */

const SKELETON_ROWS = 6;

interface ApplicationsTableSkeletonProps {
  columns?: number;
}

export const ApplicationsTableSkeleton: React.FC<ApplicationsTableSkeletonProps> = ({
  columns = 4,
}) => {
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
