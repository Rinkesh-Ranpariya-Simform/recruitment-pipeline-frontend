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

/** Skeleton placeholder matching the real table layout to prevent layout shift. */
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

/** Roles table with clickable rows. Title column also has a Link for keyboard/middle-click. */
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
              // Skip row-click if the user clicked the title link directly.
              if ((event.target as HTMLElement).closest('a')) {
                return;
              }

              router.push(`/roles/${role.id}`);
            }}
          >
            {/* Takes remaining width and truncates long titles. */}
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
