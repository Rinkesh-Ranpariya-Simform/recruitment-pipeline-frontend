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
import { formatAbsoluteUtc, formatRelative } from '@/lib/format-date';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditMetadata } from './AuditMetadata';
import { entityLabel } from '../labels';
import type { AuditEntry } from '../types';

/** Placeholder skeleton rows for table loading state. */
const SKELETON_ROWS = 8;

const AuditTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="whitespace-nowrap">When</TableHead>
        <TableHead className="whitespace-nowrap">Action</TableHead>
        <TableHead className="whitespace-nowrap">Entity</TableHead>
        <TableHead className="whitespace-nowrap">Actor</TableHead>
        <TableHead className="w-full">Details</TableHead>
      </TableRow>
    </TableHeader>
  );
};

/** Skeleton loader matching audit table layout to prevent content shift. */
export const AuditTableSkeleton: React.FC = () => {
  return (
    <Table>
      <AuditTableHead />
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="py-3">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-5 w-28 rounded-4xl" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-56 max-w-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

interface AuditTableProps {
  entries: Array<AuditEntry>;
}

/** Renders the audit log entries table with timestamp, action badge, entity, actor, and details. */
export const AuditTable: React.FC<AuditTableProps> = ({ entries }) => {
  return (
    <Table>
      <AuditTableHead />
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id} className="hover:bg-transparent">
            {/* Relative for scanning, absolute UTC in the tooltip for
                disputing. Displays both timestamp and relative time */}
            <TableCell className="py-3 align-top whitespace-nowrap text-muted-foreground">
              <time dateTime={entry.createdAt} title={formatAbsoluteUtc(entry.createdAt)}>
                {formatRelative(entry.createdAt)}
              </time>
            </TableCell>

            <TableCell className="py-3 align-top">
              <AuditActionBadge action={entry.action} />
            </TableCell>

            <TableCell className="py-3 align-top whitespace-nowrap">
              {entityLabel(entry.entityType)}{' '}
              <span className="font-mono text-muted-foreground">#{entry.entityId}</span>
            </TableCell>

            {/* Actor name and role */}
            <TableCell className="py-3 align-top whitespace-nowrap">
              <span className="font-medium">{entry.actor.name}</span>{' '}
              <span className="text-xs text-muted-foreground">{entry.actor.role}</span>
            </TableCell>

            <TableCell className="w-full max-w-0 py-3 align-top">
              <AuditMetadata action={entry.action} metadata={entry.metadata} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
