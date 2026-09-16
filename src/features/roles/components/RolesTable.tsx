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
import { formatAbsolute } from '@/lib/format-date';
import { RoleStatusBadge } from './RoleStatusBadge';
import type { Role } from '../types';

/** Placeholder rows shown while the list loads. */
const SKELETON_ROWS = 5;

const RolesTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-full">Title</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Created</TableHead>
      </TableRow>
    </TableHeader>
  );
};

/**
 * The loading state: same header, columns and row height as the real table, so
 * nothing shifts when the data lands.
 */
export const RolesTableSkeleton: React.FC = () => {
  return (
    <Table>
      <RolesTableHead />
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="py-3">
              <Skeleton className="h-4 w-56 max-w-full" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-5 w-16 rounded-4xl" />
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

interface RolesTableProps {
  roles: Array<Role>;
}

/**
 * Title · Status · Created. The description is left out — it's a paragraph, and
 * a table row isn't where you read one.
 *
 * The whole row is clickable and the title is also a real `<Link>`: the row is
 * what a mouse expects, and the link is what makes the destination
 * keyboard-reachable, middle-clickable and copyable.
 */
export const RolesTable: React.FC<RolesTableProps> = ({ roles }) => {
  const router = useRouter();

  return (
    <Table>
      <RolesTableHead />
      <TableBody>
        {roles.map((role) => (
          <TableRow
            key={role.id}
            className="cursor-pointer"
            onClick={(event) => {
              // Let the title link handle its own clicks, so middle-click and
              // ⌘-click still open a new tab.
              if ((event.target as HTMLElement).closest('a')) {
                return;
              }

              router.push(`/roles/${role.id}`);
            }}
          >
            {/* `max-w-0` with `w-full` lets this cell take the leftover width
                and truncate inside it. Without the truncation a long title
                would scroll the whole table sideways, since the table primitive
                sits in an `overflow-x-auto` container. */}
            <TableCell className="w-full max-w-0 py-3">
              <Link
                href={`/roles/${role.id}`}
                title={role.title}
                className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {role.title}
              </Link>
            </TableCell>
            <TableCell className="py-3">
              <RoleStatusBadge status={role.status} />
            </TableCell>
            <TableCell className="py-3 text-right text-muted-foreground">
              {formatAbsolute(role.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
